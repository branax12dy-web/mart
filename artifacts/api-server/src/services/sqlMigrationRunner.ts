import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSqlMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[migrations] DATABASE_URL not set, skipping migrations");
    return;
  }
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query("SELECT 1");
    console.log("[migrations] Database connection successful");
    // Create migrations table if needed (optional)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    // Run any pending migration files
    const migrationsDir = path.join(__dirname, "../../../lib/db/migrations");
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();
      for (const file of files) {
        const { rows } = await pool.query("SELECT 1 FROM _schema_migrations WHERE filename = $1", [file]);
        if (rows.length) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await pool.query(sql);
        await pool.query("INSERT INTO _schema_migrations (filename) VALUES ($1)", [file]);
        console.log(`[migrations] Applied ${file}`);
      }
    }
  } catch (err) {
    console.error("[migrations] Failed", err);
  } finally {
    await pool.end();
  }
}
