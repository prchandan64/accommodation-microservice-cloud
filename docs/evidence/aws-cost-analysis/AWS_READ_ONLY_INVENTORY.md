# AWS Read-Only Inventory — Account `516821890151` (`ap-south-1`)

- **Verification Date:** `2026-11-25`
- **Profile:** `accommodation-personal` (isolated config `C:\Users\Prcha\.aws-accommodation-personal\`)
- **Verified STS Identity:** `Account=516821890151`, `Arn=arn:aws:iam::516821890151:user/accommodation-deployer`
- **Region:** `ap-south-1` (Asia Pacific Mumbai)

## 1. Compute & Storage Inventory
- **EC2 Instances:** `0` (`[]`)
- **EBS Volumes:** `0` (`[]`)
- **EBS Snapshots (self):** `0` (`[]`)
- **Elastic IP Addresses:** `0` (`[]`)
- **EC2 Key Pairs:** `0` (`[]`)

## 2. Networking Inventory (`ap-south-1`)
- **Default VPC:** `vpc-0d9c3905640105845` (`172.31.0.0/16`, `IsDefault: true`)
- **Subnets (3):**
  - `subnet-091ad872ff47ec575` (`ap-south-1b`, `172.31.0.0/20`, `MapPublicIpOnLaunch: true`)
  - `subnet-05d5d4a1092ce82ec` (`ap-south-1c`, `172.31.16.0/20`, `MapPublicIpOnLaunch: true`)
  - `subnet-06a2d1bdeaac850e8` (`ap-south-1a`, `172.31.32.0/20`, `MapPublicIpOnLaunch: true`)
- **Internet Gateway:** `igw-04baa840be0fafe94` (attached to `vpc-0d9c3905640105845`)
- **Route Table:** `rtb-0c8d454714a4dc8b5` (`172.31.0.0/16 -> local`, `0.0.0.0/0 -> igw-04baa840be0fafe94`)
- **Security Groups:** `sg-00fa1d4ca8ba941a6` (`default`, `vpc-0d9c3905640105845`)
- **Availability Zones:** `ap-south-1a`, `ap-south-1b`, `ap-south-1c` (`available`)

## 3. EC2 Small Instance Types (`ap-south-1` API Check)
| Instance Type | vCPU | Memory | Architecture | `FreeTierEligible` (`ap-south-1`) |
| :--- | :--- | :--- | :--- | :--- |
| `t3.micro` | 2 | 1024 MiB | `x86_64` | `true` |
| `t3.small` | 2 | 2048 MiB | `x86_64` | `true` |
| `t3a.micro` | 2 | 1024 MiB | `x86_64` | `false` |
| `t3a.small` | 2 | 2048 MiB | `x86_64` | `false` |
| `t2.micro` | 1 | 1024 MiB | `i386`, `x86_64` | `false` |

## 4. RDS Inventory & Orderable PostgreSQL 16 Options (`ap-south-1`)
- **RDS DB Instances:** `0` (`[]`)
- **RDS DB Snapshots:** `0` (`[]`)
- **Available PostgreSQL 16 Versions:** `16.11`, `16.12`, `16.13`, `16.14`, `16.15`, `16.16` (`16.4` is not orderable in `ap-south-1`)
- **Orderable Small Classes for PG `16.16`:** `db.t3.micro`, `db.t3.small`, `db.t4g.micro`, `db.t4g.small` (all support `MultiAZ: true` and `gp2`, `gp3`, `io1`, `io2`).

## 5. Permission Limitations Observed
- `servicequotas:GetServiceQuota` (`ec2 / L-1216C47A`) returned `AccessDeniedException` (not included in current read-only IAM policies).
