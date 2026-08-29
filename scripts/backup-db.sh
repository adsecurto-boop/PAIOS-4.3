#!/usr/bin/env bash
# PAIOS 5.0 Automated SQLite Database Backup Script
# Usage: ./scripts/backup-db.sh or via crontab:
# 0 2 * * * /app/scripts/backup-db.sh > /dev/null 2>&1

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_PATH="${DB_PATH:-./data/paios5.sqlite}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/paios5_${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"
    echo "SQLite backup created at ${BACKUP_FILE}"
elif [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "Backup copied to ${BACKUP_FILE}"
else
    echo "Database file $DB_PATH not found."
    exit 1
fi

# Retain last 30 backups
find "$BACKUP_DIR" -type f -name "paios5_*.sqlite" -mtime +30 -delete 2>/dev/null || true
