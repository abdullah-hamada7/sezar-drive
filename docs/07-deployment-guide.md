# Deployment Guide: Fleet Management Platform

This guide provides a comprehensive, step-by-step manual for deploying the Sezar Drive platform to AWS using Terraform and Docker Compose.

---

## Phase 1: Prerequisites & Local Setup

Before starting the deployment, ensure you have the following ready:

1. **AWS Account**: An active AWS account with permissions to manage EC2, S3, IAM, Secrets Manager, and SSM.
2. **AWS CLI**: Installed and configured locally with `aws configure`.
3. **Terraform**: Version 1.0.0+ installed on your machine.
4. **SSH Key Pair**: An existing AWS EC2 Key Pair (e.g., `sezar-key`). Note the name.
5. **Git**: To push changes to the repository.
6. **Docker & Docker Compose**: Installed locally for building/testing images.

---

## Phase 1.5: Remote State Bootstrap (Recommended)

Before provisioning your main infrastructure, it is highly recommended to set up an **Encrypted Remote Backend**. This ensures your Terraform state (which contains your DB password in plaintext) is stored securely in AWS S3 and not on your local machine.

1. **Run the Bootstrap Script**:

    ```bash
    cd terraform/scripts
    bash bootstrap_tf_backend.sh
    ```

2. **Update Configuration**:
    The script will output a `backend "s3"` block. Copy and paste this into the `terraform {}` block in `terraform/main.tf`.

3. **Initialize**:

    ```bash
    terraform init -reconfigure
    ```

---

## Phase 2: Infrastructure Provisioning

The infrastructure is managed via Terraform and located in the `terraform/` directory.

1. **Initialize Terraform**:

    ```bash
    cd terraform
    terraform init
    ```

2. **Configure Variables**:
    Create a `terraform.tfvars` file (using `terraform.tfvars.example` as a template):

    ```hcl
    project_name    = "sezar-drive"
    aws_region      = "us-east-1"
    key_name        = "your-key-name"
    ssh_cidr_blocks = ["Your.IP.Address/32"]
    ```

3. **Deploy Infrastructure**:

    ```bash
    terraform apply
    ```

    *This will create the VPC, EC2 instance, S3 bucket, IAM roles, and the initial Secret Manager placeholders.*

4. **Note Outputs**:
    Copy the `public_ip` and `s3_bucket_name` from the Terraform outputs.

---

## Phase 3: Secret Management

We use **AWS Secrets Manager** for sensitive credentials to prevent them from being stored in plaintext on the server.

1. **Provision Real Secrets**:
    * Navigate to the **AWS Console** -> **Secrets Manager**.
    * Find the secret named `sezar-drive-prod-secrets`.
    * Select **Retrieve secret value** -> **Edit**.
    * Enter the real values for:
        * `POSTGRES_PASSWORD`: A strong random password.
        * `JWT_SECRET`: A random string (at least 32 characters).

2. **SSM Parameters**:
    The system automatically creates SSM parameters for `DATABASE_URL` and `S3_BUCKET`. No manual action is required unless you need to override these.

---

## Phase 4: Application Deployment

1. **Prepare the Server**:
    SSH into the newly created EC2 instance:

    ```bash
    ssh -i path/to/your-key.pem ubuntu@<PUBLIC_IP>
    ```

2. **Clone & Configure**:

    ```bash
    git clone https://github.com/your-repo/sezar-drive.git
    cd sezar-drive
    ```

3. **Configure Production Environment**:
    Check `compose.prod.yml`. Ensure `DOMAIN_NAME` and `EMAIL_FOR_SSL` (for Caddy) are set if applicable.

4. **Start the Platform**:

    ```bash
    docker compose -f compose.prod.yml up -d --build
    ```

---

## Phase 5: Post-Deployment Verification

1. **Check Backend Logs**:
    Ensure the backend correctly retrieved secrets from AWS:

    ```bash
    docker compose -f compose.prod.yml logs -f backend
    ```

    You should see: `Successfully loaded Secrets Manager configuration.`

2. **Database Migrations**:
    Run Prisma migrations on the production database:

    ```bash
    docker compose -f compose.prod.yml exec backend npx prisma migrate deploy
    ```

3. **Seed Data (Optional)**:
    If this is a fresh installation:

    ```bash
    docker compose -f compose.prod.yml exec backend npm run seed
    ```

---

## Phase 6: Maintenance & Updates

### Updating the Application

To deploy a new version:

1. Pull the latest changes on the server: `git pull`.
2. Rebuild and restart: `docker compose -f compose.prod.yml up -d --build`.

### Updating Secrets

When you change a secret in AWS Secrets Manager, **restart the backend** to pick up the new value:

```bash
docker compose -f compose.prod.yml restart backend
```

---

## Security Best Practices

* **Rotate JWT Secrets**: Change the `JWT_SECRET` in AWS console every 90 days.
* **Prune Logs**: Regularly verify that senior credentials are not accidentally logged.
* **Security Groups**: Keep `ssh_cidr_blocks` restricted to your specific IP.
