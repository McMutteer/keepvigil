#!/bin/bash
# Database backup script for Vigil PostgreSQL
# Run daily via cron: 0 3 * * * /path/to/backup-db.sh
#
# Usage: ./scripts/backup-db.sh [retention_days]
# Default retention: 7 days

set -euo pipefail

BACKUP_DIR="/var/backups/vigil"
RETENTION_DAYS="${1:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vigil_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Run pg_dump inside the postgres container and compress
docker exec code-postgres-1 pg_dump -U vigil vigil | gzip > "$BACKUP_FILE"

# Verify backup is not empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty — $BACKUP_FILE"
  rm -f "$BACKUP_FILE"
  exit 1
fi

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup created: $BACKUP_FILE ($SIZE)"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "vigil_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "Cleaned $DELETED backup(s) older than $RETENTION_DAYS days"
fi
