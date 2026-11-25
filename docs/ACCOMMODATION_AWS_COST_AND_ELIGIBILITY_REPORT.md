# Accommodation Microservice — AWS Service Eligibility, Deployment Plan & Cost Estimation Report

- **Account:** `516821890151` (`accommodation-deployer`, AWS Free Plan, `$100.00` credits, Free Plan expires `2027-05-25`, Credits expire `2027-11-25`)
- **Region:** `ap-south-1` (Asia Pacific Mumbai)
- **Verification Date:** `2026-11-25`
- **Target:** Minimum 10 continuous days, strict `₹0` out-of-pocket expenditure, **no Paid Plan upgrade**.
- **Provisioning & Verification Distinction:**
  - **Console Accessibility:** EC2, RDS (`16.16-R1`), S3, CloudWatch, and SNS consoles were manually verified as accessible in account `516821890151` (`ap-south-1`).
  - **Verified Eligibility:** Read-only AWS CLI checks (`ec2 describe-instance-types`, `rds describe-orderable-db-instance-options`) and official AWS Free Plan documentation confirm service availability and Free Tier eligibility.
  - **Actual Provisioning:** **0 AWS resources provisioned.** Zero EC2 instances, EBS volumes, RDS instances, S3 buckets, Security Groups, IAM roles, CloudWatch alarms, SNS topics, or Budgets have been created.

---

## 1. Finalized Deployment Scope

- **Included Services (9):** Amazon EC2, Amazon EBS, Amazon RDS (PostgreSQL 16), Amazon S3, Amazon VPC, Security Groups, AWS IAM, Amazon CloudWatch, Amazon SNS.
- **Explicitly Excluded:** AWS Lambda, Amazon API Gateway, NAT Gateway, Application Load Balancer (ALB), ECS/EKS, Multi-AZ RDS.
  - *Rationale:* Caddy + Nginx already handle TLS, reverse proxying, and WebSockets on EC2 (making API Gateway redundant), and the application does not require event-driven serverless functions (making Lambda unnecessary).

---

## 2. AWS Free Plan Service Eligibility Matrix (`ap-south-1`)

> Under the AWS Free Plan (up to 6 months or until `$100.00` credits are exhausted, hard-capped against surprise overage bills), the finalized foundational services are available without upgrading to a Paid Plan.

| Service | Available in `ap-south-1` | AWS Free Plan / Free Tier Allowance | Credit-Covered / Restriction Notes |
| :--- | :--- | :--- | :--- |
| **Amazon EC2** | Yes | `t3.micro` & `t3.small` report `FreeTierEligible: true` in `ap-south-1` API; 750 hrs/mo Linux Free Tier | Usage beyond free allowance deducts from `$100.00` credits (`t3.small` `~$0.0224/hr`) |
| **Amazon EBS** | Yes | Up to `30 GB` EBS General Purpose SSD (`gp3`/`gp2`) under 12-mo Free Tier | Beyond `30 GB` or snapshots deducts from credits (`gp3` `~$0.115/GB-mo`) |
| **Public IPv4** | Yes | Up to `750 hrs/mo` for 12 months on eligible new accounts | `$0.005/hr` (`~$3.60/mo`) if not covered by Free Tier |
| **Amazon RDS (PostgreSQL 16)** | Yes (`16.11`–`16.16`) | `750 hrs/mo` Single-AZ `db.t4g.micro` / `db.t3.micro`, `20 GB` SSD, `20 GB` backup, Database Insights Standard (`7-day` free retention) | `16.16-R1` available; Multi-AZ is **not** free; storage autoscaling must remain **disabled** |
| **Amazon S3** | Yes | `5 GB` Standard, `20k` GET, `2k` PUT/mo | Beyond allowance deducts from credits; add lifecycle rule to expire old object versions |
| **Amazon VPC / Security Groups** | Yes | Core VPC, Subnets, IGW, Route Tables, Security Groups: `$0.00` | Avoid NAT Gateway (`~$0.045/hr` + data processing) |
| **AWS IAM** | Yes | `$0.00` | Included |
| **Amazon CloudWatch** | Yes | Always Free: `10` metrics, `10` alarms, `5 GB` Logs ingestion/archive | Keep log retention at `7–14 days` to stay within `5 GB` |
| **Amazon SNS** | Yes | Always Free: `1M` publishes, `1,000` email deliveries/mo | Used for CloudWatch billing/health alarms |

**Official AWS References (Verified 2026-11-25):**
- AWS Free Plan Documentation: `https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-plan.html`
- AWS Free Tier: `https://aws.amazon.com/free/`
- EC2 On-Demand Pricing: `https://aws.amazon.com/ec2/pricing/on-demand/`
- EBS Pricing: `https://aws.amazon.com/ebs/pricing/`
- RDS PostgreSQL Pricing: `https://aws.amazon.com/rds/postgresql/pricing/`
- S3 Pricing: `https://aws.amazon.com/s3/pricing/`
- CloudWatch Pricing: `https://aws.amazon.com/cloudwatch/pricing/`
- SNS Pricing: `https://aws.amazon.com/sns/pricing/`

---

## 3. Reviewed Target Resource Configurations (Not Yet Provisioned)

### 3.1 Compute & Storage (EC2 + EBS)
- **EC2 Instance:** `1 × t3.small` (`x86_64`, `2 vCPU`, `2 GiB` RAM, `FreeTierEligible: true` in `ap-south-1`).
  - *Why `t3.small` over `t3.micro`:* Measured Step 5 images (`backend` `348 MB`, `frontend` `74.1 MB`, `caddy` `92 MB`) and idle stack (`~89.6 MiB`) fit easily in `2 GiB` RAM with headroom for OS, Docker daemon, Alembic migrations, and traffic spikes without OOM risk.
- **Root EBS Volume:** `20 GiB gp3` (within `30 GB` Free Tier).

### 3.2 Managed Database (RDS PostgreSQL 16)
Reviewed in AWS Console (`ap-south-1`, not provisioned):
- **Engine:** PostgreSQL `16.16-R1`
- **Template:** Free tier
- **Availability:** Single-AZ
- **Instance Class:** `db.t4g.micro` (`2 vCPU`, `1 GiB` RAM, Graviton2, `~$0.021/hr`)
- **Storage:** `20 GiB gp3`, **Storage autoscaling disabled**
- **Connectivity:** **Public access disabled** (VPC private/internal access only)
- **Monitoring:** **Database Insights Standard** with **7-day free retention**

### 3.3 Object Storage (Amazon S3)
Reviewed in AWS Console (`ap-south-1`, not provisioned):
- **Bucket Type:** General purpose bucket
- **Public Access:** **Block all public access** (enabled)
- **Object Ownership:** **ACLs disabled** (Bucket owner enforced)
- **Versioning:** **Enabled** *(add a lifecycle rule to expire noncurrent versions after 30 days to prevent silent storage growth)*
- **Encryption:** **SSE-S3** (Amazon S3 managed keys)
- **Object Lock:** **Disabled**

---

## 4. Mumbai (`ap-south-1`) Credit Consumption Estimate (10 Days & 30 Days)

> **Important:** Shows **gross On-Demand cost** (worst-case if Free Tier allowances did not apply) alongside **Free Tier / Always Free coverage**. Actual net draw depends on AWS Free Plan credit/tier application.

| Component | Unit Rate (`ap-south-1`) | 10 Days (240h) Gross | 30 Days (720h) Gross | Free Tier / Always Free Coverage |
| :--- | :--- | :---: | :---: | :--- |
| **EC2 `t3.small`** | `$0.0224/hr` | `$5.38` | `$16.13` | `FreeTierEligible: true` (`750h/mo`) |
| **EBS `20 GiB gp3`** | `$0.115/GB-mo` | `$0.77` | `$2.30` | Covered by `30 GB` Free Tier |
| **Public IPv4 (1 IP)** | `$0.005/hr` | `$1.20` | `$3.60` | Covered by `750h/mo` Free Tier |
| **RDS `db.t4g.micro`** | `$0.021/hr` | `$5.04` | `$15.12` | Covered by `750h/mo` Free Tier |
| **RDS `20 GiB gp3` + 7d Backup** | `$0.131/GB-mo` | `$0.87` | `$2.62` | Covered by `20 GB` Free Tier |
| **S3 (`<1 GB`, `<5k` reqs)** | Standard | `$0.03` | `$0.05` | Covered by `5 GB` Free Tier |
| **CloudWatch (7d) + SNS + DTO (`<5 GB`)** | Always Free | `$0.00` | `$0.00` | Within Always Free limits |
| **Base Gross Subtotal** | — | **`$13.29`** | **`$39.82`** | — |
| **+ 25% Contingency Margin** | — | **`$16.61`** | **`$49.78`** | — |
| **Higher-Usage Scenario** *(burst/logs/snapshots)* | — | **`$22.00`** | **`$62.00`** | — |

- **Estimated Remaining Credits (from `$100.00`):**
  - **10 Days:** `~$83.39` remaining (worst-case gross + 25% contingency), or near `$100.00` if Free Tier allowances apply.
  - **30 Days:** `~$50.22` remaining (worst-case gross + 25% contingency), or near `$100.00` if Free Tier allowances apply.
- **Expected Out-of-Pocket Expenditure:** **`$0.00` (`₹0`)** under AWS Free Plan hard cap + `$100.00` credits.

---

## 5. Required IAM Permissions Plan (Least-Privilege for Step 8+)

### 5.1 Deployer IAM User (`accommodation-deployer`)
Currently has `AmazonEC2ReadOnlyAccess`, `AmazonRDSReadOnlyAccess`, `SignInLocalDevelopmentAccess`, and `IAMUserChangePassword`. Before Step 8B provisioning, attach the least-privilege custom policy prepared in [accommodation-deployer-policy.json](file:///C:/Users/Prcha/Downloads/SAD-Accommodation-Microservice-main/SAD-Accommodation-Microservice-main/infrastructure/accommodation-deploy/iam/accommodation-deployer-policy.json) (no `ec2:*`, `rds:*`, `s3:*`, `iam:*`, or `AdministratorAccess`, no permanent access keys, IMDSv2 enforced via `ec2:MetadataHttpTokens=required`, RDS `db.t4g.micro`/`postgres`/Single-AZ enforced via IAM conditions while `gp3` storage is enforced in provisioning script validation, Budgets via `budgets:ViewBudget`/`budgets:ModifyBudget`, and `iam:PassRole` restricted strictly to `arn:aws:iam::516821890151:role/accommodation-ec2-role` for `ec2.amazonaws.com`).

### 5.2 EC2 Instance Profile Role (`accommodation-ec2-role`)
Created manually in the IAM Console using [accommodation-ec2-trust-policy.json](file:///C:/Users/Prcha/Downloads/SAD-Accommodation-Microservice-main/SAD-Accommodation-Microservice-main/infrastructure/accommodation-deploy/iam/accommodation-ec2-trust-policy.json) and [accommodation-ec2-role-policy.json](file:///C:/Users/Prcha/Downloads/SAD-Accommodation-Microservice-main/SAD-Accommodation-Microservice-main/infrastructure/accommodation-deploy/iam/accommodation-ec2-role-policy.json) so the EC2 instance receives temporary credentials for `arn:aws:s3:::accommodation-*` and `/accommodation/prod*` CloudWatch Logs (zero static AWS keys on EC2).

---

## 6. Secure Networking Plan (`vpc-0d9c3905640105845`)

- **VPC:** Reuse existing Default VPC `vpc-0d9c3905640105845` (`172.31.0.0/16`) with existing IGW `igw-04baa840be0fafe94` and route table `rtb-0c8d454714a4dc8b5` (`$0.00`, no NAT Gateway).
- **Subnets:**
  - **EC2 (`t3.small`):** Placed in `subnet-06a2d1bdeaac850e8` (`ap-south-1a`, public IPv4 enabled).
  - **RDS (`db.t4g.micro`):** DB Subnet Group spanning `subnet-091ad872ff47ec575` (`ap-south-1b`) and `subnet-05d5d4a1092ce82ec` (`ap-south-1c`) with **Public access disabled** (no public IP assigned).
- **Security Groups:**
  - **`accommodation-ec2-sg`:**
    - Inbound: `TCP 80` (`0.0.0.0/0`, Caddy HTTP->HTTPS redirect), `TCP 443` (`0.0.0.0/0`, Caddy HTTPS), `TCP 22` (**restricted to user's current `/32` IP only** — or removed if using EC2 Instance Connect).
    - Outbound: `TCP 443` (external HTTPS/Brevo/S3/OS updates), `TCP 587` (Brevo STARTTLS OTP), `TCP 5432` to `accommodation-rds-sg`.
  - **`accommodation-rds-sg`:**
    - Inbound: **`TCP 5432` from `accommodation-ec2-sg` ONLY** (zero `0.0.0.0/0` access).
    - Outbound: Restricted (none required).

---

## 7. Blockers, Restrictions & Recommended Next Steps

- **Current IAM Read-Only Gaps:**
  - `s3:ListAllMyBuckets` returned `AccessDenied` (S3 read policy not attached to `accommodation-deployer`).
  - `servicequotas:GetServiceQuota` returned `AccessDeniedException` (verified manually via Console instead).
  - `accommodation-deployer` currently lacks create/write permissions for Step 8 provisioning.
- **Recommended Next Steps (Pending User Approval for Step 8):**
  1. Attach the scoped least-privilege provisioning policy (Section 5.1) to `accommodation-deployer`.
  2. Configure AWS Budgets (`$5`, `$15`, `$30`) + SNS email alerts.
  3. Provision VPC Security Groups, S3 bucket (with lifecycle rule), Single-AZ RDS PostgreSQL `16.16-R1`, and `t3.small` EC2 instance.
  4. Configure Brevo Free Tier (`587` STARTTLS) for production OTP email delivery.
