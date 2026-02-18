# Sezar Drive — Deployment Guide (Small Scale)

This guide covers deploying Sezar Drive for ~20 employees using a single Virtual Machine (Ubuntu 22.04 LTS or equivalent) and Docker Compose.

## 1. Server Requirements
- **OS**: Ubuntu 22.04 LTS (Recommended)
- **Specs**: 1 vCPU, 2GB RAM
- **Disk**: 20GB SSD
- **Ports**: Open 80 (HTTP), 443 (HTTPS), and 22 (SSH) in your Firewall/NSG.

## 2. Server Preparation
SSH into your server and install Docker:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose V2
sudo apt install docker-compose-v2 -y
```

## 3. Deployment Steps

1. **Clone the repository** to the server.
2. **Create the `.env` file** in the root directory:

```bash
# General
DOMAIN_NAME=drive.yourdomain.com
EMAIL_FOR_SSL=admin@yourdomain.com
NODE_ENV=production

# Database
POSTGRES_DB=fleet_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=generate_a_strong_password_here
DATABASE_URL=postgresql://postgres:password@postgres:5432/fleet_management

# Security
JWT_SECRET=generate_a_long_random_string_here

# Storage & AI (AWS)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

3. **Start the application**:
```bash
docker compose -f compose.prod.yml up -d
```

## 4. Operational Notes
- **SSL**: Caddy handles SSL certificates automatically via Let's Encrypt.
- **WebSockets**: The `Caddyfile` is pre-configured to route tracking data via `wss://`.
- **Logs**: View logs with `docker compose -f compose.prod.yml logs -f backend`.
- **Backups**: Periodically back up the `pgdata_prod` volume.
