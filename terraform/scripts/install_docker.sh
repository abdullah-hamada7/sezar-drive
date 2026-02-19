#!/bin/bash
set -e

# Update and install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

# Set up the repository
if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

# Install Docker Engine and Compose Plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add ubuntu user to docker group (ignore if already added)
sudo usermod -aG docker ubuntu || true

# Setup Daily Backup Cron (idempotent)
(crontab -l 2>/dev/null | grep -F "/home/ubuntu/scripts/backup.sh") || (crontab -l 2>/dev/null; echo "0 3 * * * /home/ubuntu/scripts/backup.sh >> /home/ubuntu/backups/backup.log 2>&1") | crontab -

# Setup Docker Log Rotation to prevent disk exhaustion
if [ ! -f /etc/docker/daemon.json ]; then
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
sudo systemctl restart docker
fi
