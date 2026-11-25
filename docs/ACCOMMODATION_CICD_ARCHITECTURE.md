# Accommodation Microservice — CI/CD Architecture

- **Repository:** `https://github.com/prchandan64/accommodation-microservice-cloud` (`main` branch)
- **Live URL:** `https://accom-portal-chandan.duckdns.org`
- **AWS Account / Region:** `516821890151` / `ap-south-1`

---

## 1. Continuous Integration (`.github/workflows/accommodation-ci.yml`)
Triggered on `push` and `pull_request` to `main` (concurrency-locked per ref):
1. **`backend-ci`:** Spins up `postgres:16-alpine`, installs Python 3.12 dependencies (`pip` cache), verifies `alembic upgrade head`, runs `pytest -q`, `bandit -r app -ll`, and `pip-audit -r requirements.txt`.
2. **`frontend-ci`:** Uses Node.js 22 (`npm` cache), runs `npm ci --legacy-peer-deps`, `npm test`, `npm run lint` (`oxlint`), `npx tsc -b`, `npm run build`, and `npm audit --omit=dev --audit-level=high`.
3. **`docker-build-verify`:** Depends on both test jobs; builds `backend/Dockerfile` and `frontend/Dockerfile` for `linux/amd64` with `push: false` and GHA build cache. Zero production credentials are accessed during CI.

---

## 2. Continuous Deployment (`.github/workflows/accommodation-cd.yml`)
Triggered only after **`Accommodation CI` completes with `conclusion == 'success'` on `main`**, or via `workflow_dispatch`:
- **Concurrency:** `accommodation-prod-deploy` (`cancel-in-progress: false`) prevents overlapping deployments.
- **Registry Publishing:** Authenticates to Docker Hub using `DOCKERHUB_USERNAME` and a scoped `DOCKERHUB_TOKEN`, builds `linux/amd64` images tagged with immutable `sha-<12-char-commit>`, and records SHA-256 digests in `$GITHUB_STEP_SUMMARY`.
- **Zero-SSH / Zero-Static-AWS-Key EC2 Deployment:**
  - Uses **GitHub OIDC** (`permissions: id-token: write`, `aws-actions/configure-aws-credentials@v4`) to assume `AWS_CD_ROLE_ARN` (`accommodation-github-cd-role`).
  - Sends an **AWS Systems Manager (`ssm:SendCommand`)** `AWS-RunShellScript` job to `i-04421ed81c55d4981` (port 22 never opened to `0.0.0.0/0`, no SSH key in GitHub Secrets).
- **Safe Rollout & Automatic Rollback:**
  - Preserves `/opt/accommodation-deploy/.env.accommodation`.
  - Runs a non-destructive pre-deploy `pg_dump` over `sslmode=verify-full` to `s3://accommodation-media-516821890151-ap-south-1/backups/`.
  - Updates `IMAGE_TAG` to `sha-<short>`, pulls and starts `backend`, `frontend`, `caddy`.
  - Polls `https://accom-portal-chandan.duckdns.org/api/v1/accommodation/ready` for up to 60s; on failure, automatically restores `.env.accommodation.bak` (previous `IMAGE_TAG`) and restarts previous containers without running destructive DB downgrades.
