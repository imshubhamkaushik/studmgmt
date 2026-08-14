#!/usr/bin/env sh
set -eu

: "${MONGODB_URI:?MONGODB_URI is required}"
: "${BACKUP_DIR:=./backups}"
: "${BACKUP_RETENTION_DAYS:=14}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DEST="$BACKUP_DIR/studmgmt-$STAMP"
mkdir -p "$DEST"

mongodump --uri="$MONGODB_URI" --archive="$DEST/database.archive" --gzip
sha256sum "$DEST/database.archive" > "$DEST/database.archive.sha256"
printf '%s\n' "createdAt=$STAMP" > "$DEST/metadata.txt"

# Retain only recent backup directories. Remote/offsite retention should be managed separately.
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name 'studmgmt-*' -mtime "+$BACKUP_RETENTION_DAYS" -exec rm -rf {} +

echo "Backup created: $DEST"
