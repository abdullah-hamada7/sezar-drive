#!/bin/bash
# Sezar Drive Database Backup Script
# Retention: 7 days

BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="sezar_drive" # Replace with actual DB name
CONTAINER_NAME="postgres_db" # Replace with actual container name

mkdir -p $BACKUP_DIR

echo "Starting backup for $DATABASE_NAME at $TIMESTAMP..."

# Perform backup using docker exec (assuming postgres is in a container)
docker exec $CONTAINER_NAME pg_dump -U postgres $DATABASE_NAME | gzip > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz"
else
    echo "Backup failed!"
    exit 1
fi

# Rotate backups: Keep only the 7 most recent
ls -t $BACKUP_DIR/db_backup_*.sql.gz | tail -n +8 | xargs -r rm

echo "Backup rotation complete."
