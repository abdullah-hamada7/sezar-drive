# Operational Runbook: Fleet Management Platform

## Architecture Overview

- **Frontend**: Nginx serving React SPA.
- **Backend**: Node.js API (non-root) talking to PostgreSQL.
- **Storage**: AWS S3 for all media.
- **Compute**: AWS EC2 (Docker-managed).

## Deployment Procedure

1. **Validation**: CI pipeline runs on every PR. Ensure it passes.
2. **Infrastructure**: CD/Terraform must be applied for infra changes.
3. **Application**: SSH to EC2 and run:

   ```bash
   docker compose pull
   docker compose up -d
   ```

## Rollback Procedure

If a deployment fails or introduces critical bugs:

1. **Application**: Revert the commit in Git and pull the previous stable image.

   ```bash
   # On EC2
   docker compose stop backend
   docker compose pull backend:STABLE_TAG
   docker compose up -d backend
   ```

2. **Database**: If migrations were destructive, restore from the last automatic RDS/EBS snapshot.

## Emergency Contacts

- Infrastructure Lead: [Insert Name]
- Backend Lead: [Insert Name]

## Troubleshooting

- **S3 Uploads Fail**: Check AWS credentials in `.env` and verify IAM Role permissions for `s3:PutObject`.
- **Database Connection**: Verify `DATABASE_URL` matches the internal Docker service name `postgres`.
- **Face Verification Fails**: Ensure `rekognition:CompareFaces` permission is enabled for the EC2 IAM Role.
