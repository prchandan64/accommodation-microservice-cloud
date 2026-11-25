# Accommodation Microservice — Exact AWS Provisioning Commands (`ap-south-1`)

> **Preflight Status:** Prepared in Step 8B (`2026-11-25`). **Do NOT execute until Step 9+ is approved.**
> **Account:** `516821890151` | **Profile:** `accommodation-personal` | **Region:** `ap-south-1` | **VPC:** `vpc-0d9c3905640105845`

---

## 0. Session Setup (Isolated Profile)
```powershell
$env:AWS_CONFIG_FILE = "C:\Users\Prcha\.aws-accommodation-personal\config"
$env:AWS_SHARED_CREDENTIALS_FILE = "C:\Users\Prcha\.aws-accommodation-personal\credentials"
$env:AWS_LOGIN_CACHE_DIRECTORY = "C:\Users\Prcha\.aws-accommodation-personal\login-cache"
$env:AWS_EC2_METADATA_DISABLED = "true"
Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY, Env:AWS_SESSION_TOKEN, Env:AWS_PROFILE, Env:AWS_DEFAULT_PROFILE, Env:AWS_ROLE_ARN, Env:AWS_WEB_IDENTITY_TOKEN_FILE -ErrorAction SilentlyContinue
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$p = @("--profile", "accommodation-personal", "--region", "ap-south-1")
```

## 1. Security Groups (`EC2` & `RDS`)
```powershell
# EC2 Security Group
$EC2_SG = & $aws ec2 create-security-group --group-name "accommodation-ec2-sg" --description "Accommodation EC2 SG (HTTP/HTTPS + Admin SSH)" --vpc-id "vpc-0d9c3905640105845" --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=AccommodationMicroservice}]" --query "GroupId" --output text @p

# Replace <YOUR_PUBLIC_IP> with current /32 IP before running
& $aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 80 --cidr "0.0.0.0/0" @p
& $aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 443 --cidr "0.0.0.0/0" @p
& $aws ec2 authorize-security-group-ingress --group-id $EC2_SG --protocol tcp --port 22 --cidr "<YOUR_PUBLIC_IP>/32" @p

# RDS Security Group (Private: EC2 SG -> TCP 5432 ONLY)
$RDS_SG = & $aws ec2 create-security-group --group-name "accommodation-rds-sg" --description "Accommodation RDS SG (Private from EC2 SG only)" --vpc-id "vpc-0d9c3905640105845" --tag-specifications "ResourceType=security-group,Tags=[{Key=Project,Value=AccommodationMicroservice}]" --query "GroupId" --output text @p
& $aws ec2 authorize-security-group-ingress --group-id $RDS_SG --protocol tcp --port 5432 --source-group $EC2_SG @p
```

## 2. Amazon S3 Bucket (`accommodation-media-516821890151-ap-south-1`)
```powershell
$BUCKET = "accommodation-media-516821890151-ap-south-1"
& $aws s3api create-bucket --bucket $BUCKET --create-bucket-configuration LocationConstraint=ap-south-1 @p
& $aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" @p
& $aws s3api put-bucket-ownership-controls --bucket $BUCKET --ownership-controls "Rules=[{ObjectOwnership=BucketOwnerEnforced}]" @p
& $aws s3api put-bucket-versioning --bucket $BUCKET --versioning-configuration "Status=Enabled" @p
& $aws s3api put-bucket-encryption --bucket $BUCKET --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' @p
& $aws s3api put-bucket-lifecycle-configuration --bucket $BUCKET --lifecycle-configuration '{"Rules":[{"ID":"ExpireOldVersions30d","Status":"Enabled","Filter":{"Prefix":""},"NoncurrentVersionExpiration":{"NoncurrentDays":30}}]}' @p
& $aws s3api put-bucket-tagging --bucket $BUCKET --tagging "TagSet=[{Key=Project,Value=AccommodationMicroservice}]" @p
```

## 3. Amazon RDS PostgreSQL `16.16` (Single-AZ, `db.t4g.micro`, `20 GiB gp3`, Private)
```powershell
& $aws rds create-db-subnet-group --db-subnet-group-name "accommodation-rds-subgrp" --db-subnet-group-description "Accommodation RDS private subnet group" --subnet-ids "subnet-091ad872ff47ec575" "subnet-05d5d4a1092ce82ec" --tags "Key=Project,Value=AccommodationMicroservice" @p

# Set $RDS_PASSWORD securely at runtime (never hardcode in files)
& $aws rds create-db-instance `
  --db-instance-identifier "accommodation-prod-db" `
  --db-instance-class "db.t4g.micro" `
  --engine "postgres" `
  --engine-version "16.16" `
  --master-username "accom_admin" `
  --master-user-password "$RDS_PASSWORD" `
  --db-name "accommodation_db" `
  --allocated-storage 20 `
  --storage-type "gp3" `
  --no-multi-az `
  --no-publicly-accessible `
  --backup-retention-period 7 `
  --db-subnet-group-name "accommodation-rds-subgrp" `
  --vpc-security-group-ids $RDS_SG `
  --tags "Key=Project,Value=AccommodationMicroservice" @p
```

## 4. Amazon EC2 (`t3.small`, `20 GiB gp3` EBS, IMDSv2, `accommodation-ec2-role`)
```powershell
# Save private key outside git repository (e.g. $env:USERPROFILE\.ssh\accommodation-prod-key.pem)
& $aws ec2 create-key-pair --key-name "accommodation-prod-key" --query "KeyMaterial" --output text @p | Out-File -Encoding ascii "$env:USERPROFILE\.ssh\accommodation-prod-key.pem"

& $aws ec2 run-instances `
  --image-id "ami-032eca770b5d15e72" `
  --instance-type "t3.small" `
  --key-name "accommodation-prod-key" `
  --subnet-id "subnet-06a2d1bdeaac850e8" `
  --security-group-ids $EC2_SG `
  --associate-public-ip-address `
  --iam-instance-profile "Name=accommodation-ec2-role" `
  --metadata-options "HttpTokens=required,HttpEndpoint=enabled" `
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Project,Value=AccommodationMicroservice},{Key=Name,Value=accommodation-prod-ec2}]" "ResourceType=volume,Tags=[{Key=Project,Value=AccommodationMicroservice}]" @p
```

## 5. CloudWatch Logs, SNS Alerts & CloudWatch Alarms
```powershell
# Log Group (7-day retention)
& $aws logs create-log-group --log-group-name "/accommodation/prod" --tags "Project=AccommodationMicroservice" @p
& $aws logs put-retention-policy --log-group-name "/accommodation/prod" --retention-in-days 7 @p

# SNS Topic & Email Subscription
$SNS_ARN = & $aws sns create-topic --name "accommodation-prod-alerts" --tags "Key=Project,Value=AccommodationMicroservice" --query "TopicArn" --output text @p
& $aws sns subscribe --topic-arn $SNS_ARN --protocol email --notification-endpoint "prchandan64@gmail.com" @p

# Example EC2 StatusCheckFailed Alarm (replace <INSTANCE_ID>)
& $aws cloudwatch put-metric-alarm `
  --alarm-name "accommodation-ec2-status-check" `
  --namespace "AWS/EC2" `
  --metric-name "StatusCheckFailed" `
  --dimensions "Name=InstanceId,Value=<INSTANCE_ID>" `
  --statistic "Maximum" --period 300 --evaluation-periods 2 --threshold 1 --comparison-operator "GreaterThanOrEqualToThreshold" `
  --alarm-actions $SNS_ARN --tags "Key=Project,Value=AccommodationMicroservice" @p
```
