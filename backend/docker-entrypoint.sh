#!/bin/sh
set -e

# Restore the latest snapshot from the S3-compatible replica if the local (ephemeral) disk
# doesn't already have a copy - covers cold starts, redeploys, and Render's free-tier spin-down.
# -if-replica-exists: don't fail on the very first-ever deploy, before any backup exists yet.
# -if-db-not-exists: don't clobber a db that's already sitting on disk (e.g. a warm restart).
litestream restore -if-replica-exists -if-db-not-exists -config /app/litestream.yml "$DASHBOARD_DB_PATH"

exec litestream replicate -config /app/litestream.yml -exec \
  "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
