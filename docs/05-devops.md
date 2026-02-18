# DevOps & Deployment Setup

## Infrastructure
The project uses **Docker Compose** to orchestrate the services:
- **Backend**: Node.js (v22) with Prisma 7 + PostgreSQL Adapter
- **Frontend**: Nginx serving React (Vite build)
- **Database**: PostgreSQL 16 (RDS or Container)

## AWS Infrastructure (Terraform)
The production environment is managed via Terraform (`infrastructure/terraform/`):
- **VPC**: Scoped public/private subnets with Security Groups.
- **EC2**: Hardened Linux instance with Docker & IMDSv2 enforced.
- **S3**: Private bucket for media, public access blocked. IAM restricted.
- **Rekognition**: Biometric face comparison service.
- **IAM Roles**: Scoped policies for S3 access and Rekognition.

## Data Protection & Backups
- **Database Backups**: Daily cron job at 03:00 UTC.
- **Retention**: 7-day rolling window on EBS/S3 snapshots.
- **Media Backups**: AWS S3 Cross-Region Replication (optional).

## Configuration Files
- `docker-compose.yml`: Main orchestration file
- `backend/Dockerfile`: Multi-stage build for API & WebSocket server
- `frontend/Dockerfile`: Multi-stage build for React + Nginx
- `frontend/nginx.conf`: Nginx reverse proxy configuration

## Quick Start
1. **Start all services**:
   ```bash
   docker-compose up -d --build
   ```

2. **Database Setup** (First time only):
   ```bash
   # Run migrations
   docker-compose exec backend npx prisma migrate deploy

   # Seed initial data (Admin user, demo driver, vehicles)
   docker-compose exec backend npm run seed
   ```

3. **Access**:
   - Web App: [http://localhost](http://localhost)
   - API: [http://localhost/api/v1](http://localhost/api/v1)
   - Database: Port 5432 (mapped to host)

## Environment Variables
Ensure `.env` files are present in `backend/` directory. See `.env.example` using key:
- `DATABASE_URL`: `postgresql://postgres:postgres@postgres:5432/fleet_management?schema=public` (Note hostname `postgres` for internal docker network)
