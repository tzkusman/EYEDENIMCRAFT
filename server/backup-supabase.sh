#!/usr/bin/env bash
# ==============================================================================
# EYE - Denim Crafts Production Database Backup Script
# Performs a timestamped pg_dump of the Supabase PostgreSQL database
# and applies a 30-day retention policy.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/eye_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=30

mkdir -p "${BACKUP_DIR}"

if [ -z "${DIRECT_URL:-}" ] && [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DIRECT_URL or DATABASE_URL environment variable must be set." >&2
  exit 1
fi

CONN_STR="${DIRECT_URL:-$DATABASE_URL}"

echo "Starting Denim Crafts database backup to ${BACKUP_FILE}..."

# Export schema and data using pg_dump with gzip compression
pg_dump "${CONN_STR}" --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"

echo "Backup created successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Prune backups older than RETENTION_DAYS
echo "Pruning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "eye_backup_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "Backup job completed."
