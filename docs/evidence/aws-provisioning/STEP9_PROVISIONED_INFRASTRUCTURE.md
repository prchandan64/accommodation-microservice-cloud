# Step 9 — AWS Provisioned Infrastructure Evidence & Cleanup Runbook

- **Provisioning Date:** `2026-11-25`
- **Account:** `516821890151` (`accommodation-deployer`, AWS Free Plan, `$100.00` credits)
- **Region:** `ap-south-1` (Mumbai)
- **Local Secret Storage (Outside Git):**
  - RDS Master Password: `C:\Users\Prcha\.aws-accommodation-personal\secrets\rds-master-password.txt` (never printed or committed)
  - EC2 SSH Key Pair: `C:\Users\Prcha\.ssh\accommodation-prod-key.pem`

---

## 1. Provisioned Resource Inventory

| Service | Resource Identifier | Verified Configuration |
| :--- | :--- | :--- |
| **VPC / Routing** | `vpc-0d9c3905640105845` (`172.31.0.0/16`) | Default VPC; main route table `rtb-0c8d454714a4dc8b5` routes `0.0.0.0/0 -> igw-04baa840be0fafe94` (all 3 default subnets are default public subnets) |
| **Security Groups** | `sg-0c2b9209229ee7e20` (`accommodation-ec2-sg`)<br>`sg-0c302a2da2acbc418` (`accommodation-rds-sg`) | EC2 SG: `TCP 80/443` (`0.0.0.0/0`), `TCP 22` (`115.99.255.64/32`)<br>RDS SG: `TCP 5432` from `sg-0c2b9209229ee7e20` ONLY |
| **EC2** | `i-04421ed81c55d4981` (`accommodation-prod-ec2`) | `t3.small`, Canonical Ubuntu 24.04 LTS (`ami-032eca770b5d15e72`, owner `099720109477`), `CpuCredits=standard`, Public IP `13.233.33.229`, Private IP `172.31.40.126`, IMDSv2 `required`, `accommodation-ec2-role` |
| **EBS** | `vol-0d7cdd556c97509dd` | `20 GiB gp3`, `Encrypted: true`, `DeleteOnTermination: true` |
| **RDS PostgreSQL** | `accommodation-prod-db` | PostgreSQL `16.16`, `db.t4g.micro`, Single-AZ, `20 GiB gp3`, `MaxAllocatedStorage: null` (autoscaling disabled), `PubliclyAccessible: false`, `BackupRetentionPeriod: 1` (Free Plan max), `DatabaseInsightsMode: standard`, Subnet Group `accommodation-rds-subgrp` (`subnet-091ad872ff47ec575`, `subnet-05d5d4a1092ce82ec`), Endpoint `accommodation-prod-db.c9kwqmwoaa8u.ap-south-1.rds.amazonaws.com:5432` |
| **S3** | `accommodation-media-516821890151-ap-south-1` | Block all public access (`true` x4), `BucketOwnerEnforced`, Versioning `Enabled`, SSE-S3 `AES256`, Lifecycle `ExpireOldVersions30d` (30 days), Prefixes `images/` & `backups/` |
| **IAM** | `accommodation-ec2-role` | Instance profile attached to EC2; verified IMDSv2 assumption and S3 `PutObject` (`200 OK`) |
| **CloudWatch** | `/accommodation/prod` + 4 Alarms | 7-day log retention; `accommodation-ec2-status-check`, `accommodation-ec2-cpu-high`, `accommodation-rds-cpu-high`, `accommodation-rds-storage-low` (all `OK`) |
| **SNS & Budget** | `arn:aws:sns:ap-south-1:516821890151:accommodation-prod-alerts`<br>`accommodation-monthly-budget` | Email `prchandan64@gmail.com` (`PendingConfirmation`); Monthly `$30.00` budget (`IncludeCredit: false`) with `$5` (`16.67%`), `$15` (`50%`), `$30` (`100%`) alerts |

---

## 2. Live Validation Results (`2026-11-25`)
- **EC2 Status Checks (`instance-status-ok`):** PASS
- **RDS Availability (`db-instance-available`):** PASS
- **SSH Connectivity (`ubuntu@13.233.33.229`):** PASS (`HOST=ip-172-31-40-126`)
- **IMDSv2 Enforcement:** PASS (`IMDSV2_ROLE=accommodation-ec2-role`, IMDSv1 returned HTTP `401`)
- **Private RDS TCP (`5432`) from EC2:** PASS (`RDS_TCP_5432=CONNECTED`)
- **S3 Instance-Role Access (`images/.keep`, `backups/.keep`):** PASS (`HTTP 200` for both)

---

## 3. Updated 10-Day Credit Consumption Estimate (`ap-south-1`)
- **Gross On-Demand Base (10 days / 240h):** `$13.29` (`$16.61` with +25% contingency) — `t3.small` (`$5.38`), `20 GiB gp3` EBS (`$0.77`), Public IPv4 (`$1.20`), `db.t4g.micro` (`$5.04`), `20 GiB gp3` RDS + 1d backup (`$0.87`), S3 (`$0.03`), CloudWatch/SNS/DTO (`$0.00`).
- **Expected Net Credit Draw (10 days):** Near `$0.00` if Free Tier allowances apply, or at most **`$13.29–$16.61`** against `$100.00` credits (`~$83.39` remaining worst-case), **`₹0` out-of-pocket**.

---

## 4. Resource Cleanup Commands (Run After Project Evaluation)
```powershell
$env:AWS_CONFIG_FILE = "C:\Users\Prcha\.aws-accommodation-personal\config"
$env:AWS_SHARED_CREDENTIALS_FILE = "C:\Users\Prcha\.aws-accommodation-personal\credentials"
$env:AWS_LOGIN_CACHE_DIRECTORY = "C:\Users\Prcha\.aws-accommodation-personal\login-cache"
$env:AWS_EC2_METADATA_DISABLED = "true"
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$p = @("--profile", "accommodation-personal", "--region", "ap-south-1")

# 1. Terminate EC2 & delete Key Pair
& $aws ec2 terminate-instances --instance-ids "i-04421ed81c55d4981" @p
& $aws ec2 wait instance-terminated --instance-ids "i-04421ed81c55d4981" @p
& $aws ec2 delete-key-pair --key-name "accommodation-prod-key" @p

# 2. Delete RDS & DB Subnet Group
& $aws rds delete-db-instance --db-instance-identifier "accommodation-prod-db" --skip-final-snapshot @p
& $aws rds wait db-instance-deleted --db-instance-identifier "accommodation-prod-db" @p
& $aws rds delete-db-subnet-group --db-subnet-group-name "accommodation-rds-subgrp" @p

# 3. Delete Security Groups
& $aws ec2 delete-security-group --group-id "sg-0c302a2da2acbc418" @p
& $aws ec2 delete-security-group --group-id "sg-0c2b9209229ee7e20" @p

# 4. Delete CloudWatch Alarms, Log Group, SNS Topic (empty S3 bucket versions in Console or s3api before deleting bucket)
& $aws cloudwatch delete-alarms --alarm-names "accommodation-ec2-status-check" "accommodation-ec2-cpu-high" "accommodation-rds-cpu-high" "accommodation-rds-storage-low" @p
& $aws logs delete-log-group --log-group-name "/accommodation/prod" @p
& $aws sns delete-topic --topic-arn "arn:aws:sns:ap-south-1:516821890151:accommodation-prod-alerts" @p
```
