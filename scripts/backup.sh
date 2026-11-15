#!/usr/bin/env bash
# Regular DB backup. Schedule via cron: 0 3 * * * /app/scripts/backup.sh
set -euo pipefail
DIR="${BACKUP_DIR:-./backups}"; mkdir -p "$DIR"
FILE="$DIR/mscommerce-$(date +%Y%m%d-%H%M%S).sql.gz"
pg_dump "${DATABASE_URL:?DATABASE_URL required}" | gzip > "$FILE"
tar -czf "$DIR/uploads-$(date +%Y%m%d).tar.gz" uploads 2>/dev/null || true
find "$DIR" -name "*.gz" -mtime +14 -delete
echo "Backup written: $FILE"
