import fs from "fs";
import path from "path";
import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const MIGRATIONS_DIR = path.resolve(process.cwd(), "../..", "lib/db/migrations");

export async function runSqlMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  let files: string[];
  try {
    files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();
  } catch (e) {
    logger.warn({ migrationsDir: MIGRATIONS_DIR }, "[migrations] Directory not found, skipping SQL file migrations");
    return;
  }

  const appliedRows = await db.execute(sql`SELECT filename FROM _schema_migrations`);
  const applied = new Set((appliedRows.rows as { filename: string }[]).map(r => r.filename));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sqlContent = fs.readFileSync(filePath, "utf-8").trim();
    if (!sqlContent) continue;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sqlContent);
      await client.query(
        "INSERT INTO _schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [file]
      );
      await client.query("COMMIT");
      logger.info({ file }, "[migrations] Applied");
      count++;
    } catch (e: unknown) {
      await client.query("ROLLBACK");
      const msg = e instanceof Error ? e.message : String(e);
      logger.error({ file, err: msg }, "[migrations] Failed to apply migration");
      throw new Error(`Migration ${file} failed: ${msg}`);
    } finally {
      client.release();
    }
  }

  if (count > 0) {
    logger.info({ count }, "[migrations] SQL migrations complete");
  } else {
    logger.info("[migrations] All SQL migrations already applied");
  }
}
