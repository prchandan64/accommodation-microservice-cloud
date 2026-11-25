# Step 10 — Production Deployment Evidence (`https://accom-portal-chandan.duckdns.org`)

- **Deployment Date:** `2026-11-25`
- **Live URL:** `https://accom-portal-chandan.duckdns.org`
- **EC2 Public IP:** `13.233.33.229` (`i-04421ed81c55d4981`, `t3.small`, Ubuntu 24.04 LTS)
- **RDS Endpoint:** `accommodation-prod-db.c9kwqmwoaa8u.ap-south-1.rds.amazonaws.com:5432` (PostgreSQL `16.16`, `sslmode=verify-full`, `accom_app` restricted DML user)
- **S3 Bucket:** `accommodation-media-516821890151-ap-south-1` (EC2 instance role `accommodation-ec2-role`)

---

## 1. Docker Hub Images (`linux/amd64`)
- **Backend:** `prchandan6666/accommodation-backend:v1.1.0` (`sha256:d02839eb2908d2b32805ce542a064dc6134048cf2012ada25a58b56b74555a01`)
- **Frontend:** `prchandan6666/accommodation-frontend:v1.1.0` (`sha256:e3e755da9c03eaa882db5fd8e0d0490a534934e7354144dd4b2f231d18d6797a`)

---

## 2. Verification Summary
- **HTTPS & TLS:** Let's Encrypt certificate (`YE2`), valid until `Feb 23 15:37:52 2027 GMT`; HTTP->HTTPS `308` redirect active.
- **Health & Readiness:** `/api/v1/accommodation/health` (`200 OK`), `/api/v1/accommodation/ready` (`200 OK`, `database: connected`).
- **Port Exposure:** Public ports `8000` and `5432` verified `CLOSED` (`TimeoutError`). Only `80` and `443` exposed via Caddy.
- **Containers (`docker stats`):**
  - `accommodation-prod-caddy-1`: `16.75 MiB / 128 MiB` (`0.00% CPU`)
  - `accommodation-prod-frontend-1`: `3.20 MiB / 128 MiB` (`0.00% CPU`, `healthy`)
  - `accommodation-prod-backend-1`: `76.41 MiB / 768 MiB` (`0.14% CPU`, `healthy`)
  - EC2 RAM: `650 MiB used / 1.2 GiB available` (`1.9 GiB` total); Disk: `3.3 GiB used / 16 GiB available` (`18%`).
- **DuckDNS Auto-Update:** `duckdns-update.timer` `active` (`duckdns_update=OK` in `systemd` journal; token in `/etc/duckdns/token`, `chmod 600`).
- **CloudWatch Logs (`/accommodation/prod`):** Streams `backend`, `frontend`, `caddy`, `migrate` active with 7-day retention; zero secrets logged.
- **SNS:** `prchandan64@gmail.com` subscription confirmed.
- **Browser Evidence:** [live_https_portal.png](file:///C:/Users/Prcha/Downloads/SAD-Accommodation-Microservice-main/SAD-Accommodation-Microservice-main/docs/evidence/aws-deployment/live_https_portal.png) (`3` hostels, `2` terms, `0` console errors).

---

## 3. Rollback Instructions
1. On EC2 (`/opt/accommodation-deploy`): set `IMAGE_TAG=<previous_tag>` (or pin `@sha256:...`) in `.env.accommodation` and run:
   ```bash
   sudo docker compose -f docker-compose.accommodation.prod.yml --env-file .env.accommodation pull
   sudo docker compose -f docker-compose.accommodation.prod.yml --env-file .env.accommodation up -d backend frontend caddy
   ```
2. If an Alembic schema rollback is required, run `alembic downgrade -1` using a temporary master-credential `.env.migrate` and delete `.env.migrate` immediately after.
