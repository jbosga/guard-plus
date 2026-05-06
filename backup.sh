#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database
docker compose -f ~/app/docker-compose.prod.yml exec -T db \
  pg_dump -U researcher abduction_research \
  | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Uploaded files
tar -czf $BACKUP_DIR/storage_$TIMESTAMP.tar.gz ~/app/storage/

# Keep last 14 days only
find $BACKUP_DIR -mtime +14 -delete

echo "Backup complete: $TIMESTAMP"