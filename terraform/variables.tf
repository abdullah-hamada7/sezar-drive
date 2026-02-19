variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  default     = "sezar-drive"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "c7i-flex.large"
}

variable "ami_id" {
  description = "Canonical, Ubuntu, 24.04, amd64 noble image"
  default     = "ami-0b6c6ebed2801a5cb" # Replace with latest if needed
}

variable "ssh_cidr_blocks" {
  description = "Allowed CIDR blocks for SSH access (e.g., ['203.0.113.10/32']). Do NOT use 0.0.0.0/0."
  type        = list(string)
  # No default - Forces user to specify their IP for security
}

variable "key_name" {
  description = "Name of the EC2 Key Pair for SSH access"
  type        = string
}
