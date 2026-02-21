# Deployment Guide: Sezar Drive Platform

**Version**: 2.0
**Author Role**: DevOps Engineer
**Date**: 2026-02-21
**Change Log**: Rewrote to match current Terraform + Docker Compose + Caddy architecture with automated secrets, backups, and CloudWatch logging.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         AWS Account                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ Secrets Mgr  │  │    SSM       │  │   S3 (Photos +      │    │
│  │  DB Password │  │ DATABASE_URL │  │   DB Backups)       │    │
│  │  JWT Secret  │  │ S3_BUCKET    │  └─────────────────────┘    │
│  └──────┬───────┘  │ S3_REGION    │                              │
│         │          └──────┬───────┘                              │
│         │                 │                                      │
│  ┌──────▼─────────────────▼──────────────────────────────────┐  │
│  │              EC2 Instance (Ubuntu 24.04)                   │  │
│  │  ┌────────────────────────────────────────────────────┐   │  │
│  │  │              Docker Compose Stack                   │   │  │
│  │  │                                                    │   │  │
│  │  │  :80 → Caddy ──┬── /api/*  → Backend :3000        │   │  │
│  │  │                │── /ws/*   → Backend :3000        │   │  │
│  │  │                └── /*      → Frontend :80         │   │  │
│  │  │                                                    │   │  │
│  │  │  Backend → PostgreSQL (internal db-net only)       │   │  │
│  │  └────────────────────────────────────────────────────┘   │  │
│  │  CloudWatch Agent → /sezar-drive/docker logs              │  │
│  │  Cron (3 AM) → backup.sh → S3 (7-day retention)          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────┐                                            │
│  │ S3 (TF State)    │  ← Encrypted Remote Backend               │
│  └──────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| AWS CLI | v2+ | AWS resource management |
| Terraform | ≥ 1.0.0 | Infrastructure provisioning |
| Git | any | Source control |
| SSH client | any | Server access |

**AWS Permissions Required**: EC2, S3, IAM, Secrets Manager, SSM, CloudWatch Logs, Rekognition.

**Create an EC2 Key Pair** (if not done already):

```bash
aws ec2 create-key-pair --key-name sezar-drive --query 'KeyMaterial' --output text > sezar-drive.pem
chmod 400 sezar-drive.pem
```

---

## Phase 2: Bootstrap Remote State (One-Time)

Terraform state contains sensitive values (DB passwords) in plaintext. This step stores state in an encrypted S3 bucket instead of locally.

```bash
cd terraform/scripts
bash bootstrap_tf_backend.sh
```

The script creates:

- **S3 Bucket**: Versioned, encrypted (AES-256), with SSL-only access policy and public access blocked.
- **DynamoDB Table**: For state locking (`sezar-drive-tf-lock`).

Copy the output `backend "s3"` block into `terraform/main.tf` inside the `terraform {}` block, then:

```bash
cd ../
terraform init -reconfigure
```

> [!IMPORTANT]
> If you already have a remote backend configured (check `main.tf` for an existing `backend "s3"` block), skip this phase entirely.

---

## Phase 3: Infrastructure Provisioning

### 3.1 Configure Variables

Create `terraform/terraform.tfvars` from the example:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
# Required — your public IP for SSH access (https://ifconfig.me/ip)
ssh_cidr_blocks = ["YOUR_IP/32"]

# Required — AWS EC2 Key Pair name
key_name = "sezar-drive"

# Optional overrides
aws_region    = "us-east-1"
project_name  = "sezar-drive"
instance_type = "c7i-flex.large"
```

### 3.2 Deploy

```bash
cd terraform
terraform init
terraform apply
```

### What Gets Created

| Resource | Details |
|----------|---------|
| **VPC** | `10.0.0.0/16` with public subnet, IGW, and route table |
| **Security Group** | SSH (restricted to your IP), HTTP/HTTPS (public) |
| **EC2** | Ubuntu 24.04, encrypted gp3 root volume (20 GB), IMDSv2 enforced |
| **S3 Bucket** | `sezar-drive-photos-<random>`, versioned, encrypted, private |
| **IAM Role** | S3 access, Rekognition (`CompareFaces`), Secrets Manager, SSM, CloudWatch Logs |
| **Secrets Manager** | `sezar-drive-prod-secrets` with auto-generated `POSTGRES_PASSWORD` and `JWT_SECRET` |
| **SSM Parameters** | `DATABASE_URL`, `S3_BUCKET`, `S3_REGION` |
| **User Data** | Installs Docker, AWS CLI, CloudWatch Agent, configures daily backup cron |

### 3.3 Note Outputs

```bash
terraform output
```

Save these values:

- `public_ip` — server IP address
- `s3_bucket_name` — photo storage bucket name
- `ssh_command` — ready-to-use SSH command

---

## Phase 4: Application Deployment

### 4.1 SSH Into Server

```bash
ssh -i sezar-drive.pem ubuntu@<PUBLIC_IP>
```

### 4.2 Clone Repository

```bash
git clone https://github.com/your-org/sezar-drive.git
cd sezar-drive
```

> [!TIP]
> If you encounter `fatal: protocol 'https' is not supported`, ensure Git has SSL support by running:
>
> ```bash
> sudo apt-get update && sudo apt-get install --reinstall -y git git-man libcurl4-openssl-dev
> ```

### 4.3 Configure Production Environment

Create `.env` at the project root using `.env.prod.example` as a template:

```bash
cp .env.prod.example .env
nano .env
```

**Required values to set**:

| Variable | Source | Example |
|----------|--------|---------|
| `DOMAIN_NAME` | Your domain or server IP | `54.123.45.67` |
| `EMAIL_FOR_SSL` | Email for Let's Encrypt (used when HTTPS enabled) | `admin@sezar.com` |
| `POSTGRES_DB` | Fixed | `sezar_drive` |
| `POSTGRES_USER` | Fixed | `postgres` |
| `POSTGRES_PASSWORD` | **AWS Secrets Manager** → `sezar-drive-prod-secrets` → `POSTGRES_PASSWORD` | auto-generated |
| `FRONTEND_URL` | Same as `DOMAIN_NAME` with protocol | `http://54.123.45.67` |
| `S3_BUCKET` | Terraform output `s3_bucket_name` | `sezar-drive-photos-a1b2c3d4` |
| `S3_REGION` | Same as Terraform `aws_region` | `us-east-1` |

> [!TIP]
> Retrieve the auto-generated password from Secrets Manager:
>
> ```bash
> aws secretsmanager get-secret-value --secret-id sezar-drive-prod-secrets --query 'SecretString' --output text | python3 -c "import sys,json; print(json.loads(sys.stdin.read())['POSTGRES_PASSWORD'])"
> ```

### 4.4 Deploy

```bash
docker compose -f compose.prod.yml up -d --build
```

### 4.5 Run Database Migrations

```bash
docker compose -f compose.prod.yml exec backend npx prisma migrate deploy
```

### 4.6 Seed Admin User

```bash
docker compose -f compose.prod.yml exec backend npm run seed
```

This creates only the admin user (`hossam@sezar.com`). All drivers, vehicles, and other data must be created via the admin dashboard.

---

## Phase 5: Post-Deployment Verification

### Health Checks

```bash
# Backend health
curl http://<PUBLIC_IP>/api/v1/health

# Backend logs (should show "Successfully loaded Secrets Manager configuration")
docker compose -f compose.prod.yml logs -f backend

# All containers running
docker compose -f compose.prod.yml ps
```

### Verify Backup Cron

```bash
crontab -l
# Expected: 0 3 * * * S3_BUCKET=<bucket> /home/ubuntu/scripts/backup.sh ...
```

### Verify CloudWatch Agent

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

Logs are shipped to CloudWatch log groups:

- `/sezar-drive/docker` — all container logs
- `/sezar-drive/backups` — daily backup logs

---

## Phase 6: Maintenance

### Updating the Application

```bash
cd ~/sezar-drive
git pull
docker compose -f compose.prod.yml up -d --build
```

### Updating Secrets

After changing a secret in AWS Secrets Manager, restart the backend to pick up new values:

```bash
docker compose -f compose.prod.yml restart backend
```

### Manual Database Backup

```bash
S3_BUCKET=<bucket-name> /home/ubuntu/scripts/backup.sh
```

Automated backups run daily at **03:00 UTC** with **7-day local retention** and S3 upload.

### Enabling HTTPS (When Domain is Ready)

1. Point your domain's DNS A record to the server IP.
2. Edit `.env`: set `DOMAIN_NAME=yourdomain.com` and `EMAIL_FOR_SSL=admin@yourdomain.com`.
3. Edit `Caddyfile`: remove `auto_https off` and uncomment the `:443` port in `compose.prod.yml`.
4. Restart: `docker compose -f compose.prod.yml up -d`.

Caddy handles certificate provisioning and renewal automatically.

---

## Phase 7: Teardown

To destroy all provisioned infrastructure:

```bash
cd terraform
terraform destroy
```

> [!CAUTION]
> This permanently deletes the EC2 instance, S3 bucket (if empty), secrets, SSM parameters, and all networking. Database data in the Docker volume is lost with the instance.

---

## Security Checklist

| Control | Status |
|---------|--------|
| SSH restricted to specific IP (`ssh_cidr_blocks`) | ✅ |
| IMDSv2 enforced on EC2 | ✅ |
| Root volume encrypted (gp3) | ✅ |
| S3 bucket: private, encrypted (AES-256), versioned, SSL-only | ✅ |
| Secrets in AWS Secrets Manager (auto-generated) | ✅ |
| IAM role with least-privilege (S3, Rekognition, SSM, Secrets, CloudWatch) | ✅ |
| Database on internal Docker network (`db-net`, no internet) | ✅ |
| Terraform state encrypted in remote S3 backend | ✅ |
| Docker log rotation (10 MB × 3 files) | ✅ |
| Centralized logging via CloudWatch Agent | ✅ |
| Daily automated backups to S3 (7-day retention) | ✅ |

---

## Quick Reference

| Item | Value |
|------|-------|
| **Admin Login** | `hossam@sezar.com` / `Hossam@2026` |
| **SSH** | `ssh -i sezar-drive.pem ubuntu@<IP>` |
| **Logs** | `docker compose -f compose.prod.yml logs -f backend` |
| **Redeploy** | `git pull && docker compose -f compose.prod.yml up -d --build` |
| **Backup** | `S3_BUCKET=<bucket> /home/ubuntu/scripts/backup.sh` |
| **Migrations** | `docker compose -f compose.prod.yml exec backend npx prisma migrate deploy` |
| **Seed (admin only)** | `docker compose -f compose.prod.yml exec backend npm run seed` |
