# Accommodation Microservice — Production Deployment Guide

## Architecture
`Internet -> Caddy (TLS / Reverse Proxy) -> Nginx (SPA + API/WS Proxy) -> FastAPI (Non-Root) -> Amazon RDS PostgreSQL 16`

## 1. Local Production-Like Verification (No AWS / No Public TLS)
```bash
docker compose -p accommodation-prod-local \
  -f docker-compose.accommodation.prod.yml \
  -f docker-compose.accommodation.prod-local.yml \
  up -d --build --wait
```
Access via loopback only: `http://127.0.0.1:8081/`.

## 2. Production Deployment (EC2 + Amazon RDS)
1. Copy `.env.accommodation.example` to `.env.accommodation` and populate strong secrets.
2. Ensure Amazon RDS PostgreSQL 16 is reachable on port `5432` from the EC2 Security Group with `sslmode=require` (or `verify-full` with the AWS RDS global CA bundle mounted).
3. Run controlled migrations and start services:
   ```bash
   docker compose -f docker-compose.accommodation.prod.yml up -d --wait
   ```
4. Create the initial Housing Admin account:
   ```bash
   docker compose -f docker-compose.accommodation.prod.yml exec backend \
     python -m app.create_admin --email admin@university.edu --name "Housing Admin"
   ```
   *(Never load `seed.sql` or `app.seed` into production.)*
