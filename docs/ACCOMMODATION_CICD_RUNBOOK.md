# Accommodation Microservice — CI/CD Operations & Rollback Runbook

## 1. Required GitHub Secrets (Repository Settings -> Secrets and variables -> Actions)
| Secret | Purpose |
| :--- | :--- |
| `DOCKERHUB_USERNAME` | Docker Hub username (`prchandan6666`) |
| `DOCKERHUB_TOKEN` | Scoped Docker Hub Read/Write access token (never account password) |
| `AWS_CD_ROLE_ARN` | ARN of `accommodation-github-cd-role` (`arn:aws:iam::516821890151:role/accommodation-github-cd-role`) |

---

## 2. AWS OIDC + SSM Setup (One-Time Manual AWS Console Setup)
1. **IAM -> Identity providers -> Add provider:**
   - Type: **OpenID Connect**
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. **IAM -> Roles -> `accommodation-ec2-role` -> Add permissions -> Attach policies:**
   - Attach **`AmazonSSMManagedInstanceCore`** (so EC2 `i-04421ed81c55d4981` registers with AWS Systems Manager).
3. **IAM -> Roles -> Create role -> Web identity:**
   - Identity provider: `token.actions.githubusercontent.com`, Audience: `sts.amazonaws.com`
   - Condition: `token.actions.githubusercontent.com:sub` `StringLike` `repo:prchandan64/accommodation-microservice-cloud:ref:refs/heads/main`
   - Role name: **`accommodation-github-cd-role`**
   - Inline policy allowing ONLY:
     - `ssm:SendCommand` on `arn:aws:ec2:ap-south-1:516821890151:instance/i-04421ed81c55d4981` and `arn:aws:ssm:ap-south-1::document/AWS-RunShellScript`
     - `ssm:GetCommandInvocation` on `*`

---

## 3. DuckDNS Token Rotation Procedure (Mandatory Before Final Sign-Off)
1. Log in to `https://www.duckdns.org` and click **recreate token** (invalidates the previously shared token).
2. Update local secret file `C:\Users\Prcha\.aws-accommodation-personal\secrets\duckdns-token.txt` (never print or commit).
3. On EC2, replace `/etc/duckdns/token` (`chmod 600`, `root:root`) and run `sudo systemctl start duckdns-update.service`.
4. Verify `sudo journalctl -u duckdns-update.service -n 3 --no-pager` shows `duckdns_update=OK`.

---

## 4. Manual Rollback Procedure (Safe, Non-Destructive)
1. On EC2 (`/opt/accommodation-deploy`), edit `IMAGE_TAG=` in `.env.accommodation` to the previous known-good tag (e.g., `v1.1.0` or `sha-<previous>`).
2. Run:
   ```bash
   sudo docker compose -f docker-compose.accommodation.prod.yml --env-file .env.accommodation pull backend frontend
   sudo docker compose -f docker-compose.accommodation.prod.yml --env-file .env.accommodation up -d backend frontend caddy
   ```
3. Verify `curl -fsS https://accom-portal-chandan.duckdns.org/api/v1/accommodation/ready` returns `{"status":"ready","database":"connected"}`.
4. **Never** run `alembic downgrade` automatically in CI/CD; restore from S3 `backups/` only under manual supervision if required.
