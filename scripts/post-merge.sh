#!/bin/bash
set -e

pnpm install --no-frozen-lockfile

# Run pending SQL migrations manually (non-interactive, no drizzle-kit push)
# This avoids drizzle-kit's interactive prompts about column renames
MIGRATION_DIR="lib/db/migrations"

# Ensure migrations tracking table exists
psql "$DATABASE_URL" -c "
  CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT now()
  );
" 2>&1

# Apply each migration file in order if not already applied
for sql_file in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$sql_file")
  already_applied=$(psql "$DATABASE_URL" -tA -c "SELECT COUNT(*) FROM _schema_migrations WHERE filename = '$filename';")
  if [ "$already_applied" -eq "0" ]; then
    echo "[migration] Applying $filename..."
    psql "$DATABASE_URL" -f "$sql_file" 2>&1 && \
      psql "$DATABASE_URL" -c "INSERT INTO _schema_migrations (filename) VALUES ('$filename');" 2>&1
    echo "[migration] Applied $filename"
  else
    echo "[migration] Skipping $filename (already applied)"
  fi
done

echo "[post-merge] Done"
