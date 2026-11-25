# AWS CLI Authentication Evidence (Step 7B)

- **Project Root:** `C:\Users\Prcha\Downloads\SAD-Accommodation-Microservice-main\SAD-Accommodation-Microservice-main`
- **AWS CLI Executable:** `C:\Program Files\Amazon\AWSCLIV2\aws.exe` (`aws-cli/2.42.2`)
- **Authentication Method:** Official browser-based temporary credentials (`aws login --profile accommodation-personal --region ap-south-1 --remote`)
- **Isolated Configuration Directory:** `C:\Users\Prcha\.aws-accommodation-personal\` (outside the Git repository; `AWS_EC2_METADATA_DISABLED=true`)
- **Profile Name:** `accommodation-personal`
- **Configured Region:** `ap-south-1` (Asia Pacific Mumbai)
- **Verified STS Identity:**
  - `Account`: `516821890151` (`ACCOUNT_MATCH=True`)
  - `Arn`: `arn:aws:iam::516821890151:user/accommodation-deployer` (`ARN_MATCH=True`, non-root IAM user with MFA enabled)
- **Isolation & Safety:**
  - Existing default/college (`316658413204`) and older personal (`290185364489`) credentials were never accessed or modified.
  - No permanent IAM access keys were created; no AWS infrastructure was provisioned; AWS Free Plan remains unchanged.
