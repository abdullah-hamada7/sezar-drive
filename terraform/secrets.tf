# AWS Secrets Manager for sensitive credentials
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.project_name}-prod-secrets"
  description = "Production secrets for Sezar Drive"
  tags        = local.common_tags
}

resource "random_password" "db_password" {
  length  = 24
  special = true
  # Exclude some characters that might cause issues in URLs
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret_version" "app_secrets_val" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    POSTGRES_PASSWORD = random_password.db_password.result
    JWT_SECRET        = random_password.jwt_secret.result
  })
}

# SSM Parameter Store for non-sensitive configuration
resource "aws_ssm_parameter" "db_url" {
  name = "/${var.project_name}/prod/DATABASE_URL"
  type = "String"
  # Host must be the Docker service name 'postgres' (NOT the EC2 IP)
  # because the backend runs inside Docker alongside the database container.
  value = "postgresql://postgres:${urlencode(random_password.db_password.result)}@postgres:5432/sezar_drive"
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "s3_bucket" {
  name  = "/${var.project_name}/prod/S3_BUCKET"
  type  = "String"
  value = aws_s3_bucket.photos.id
  tags  = local.common_tags
}

resource "aws_ssm_parameter" "s3_region" {
  name  = "/${var.project_name}/prod/S3_REGION"
  type  = "String"
  value = var.aws_region
  tags  = local.common_tags
}
