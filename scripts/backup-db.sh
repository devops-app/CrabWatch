#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/crabwatch_backup_${TIMESTAMP}.sql.gz"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-crabwatch}"
DB_USER="${DB_USER:-postgres}"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

if [ -n "$BACKUP_RETENTION_DAYS" ]; then
  echo "Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
  find "$BACKUP_DIR" -name "crabwatch_backup_*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  echo "Cleanup complete."
fi

echo "Backup completed successfully."
