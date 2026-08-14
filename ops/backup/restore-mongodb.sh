#!/usr/bin/env sh
set -eu

: "${MONGODB_URI:?MONGODB_URI is required}"
: "${1:?Usage: restore-mongodb.sh /path/to/database.archive}"
ARCHIVE="$1"

if [ ! -f "$ARCHIVE" ]; then
  echo "Archive not found: $ARCHIVE" >&2
  exit 1
fi

if [ -f "$ARCHIVE.sha256" ]; then
  (cd "$(dirname "$ARCHIVE")" && sha256sum -c "$(basename "$ARCHIVE").sha256")
fi

mongorestore --uri="$MONGODB_URI" --archive="$ARCHIVE" --gzip --drop

echo "Restore completed successfully. Verify with application health/readiness checks and a data-level smoke test."
