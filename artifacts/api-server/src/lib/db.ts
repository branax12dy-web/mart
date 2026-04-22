import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@workspace/db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}
console.log("✅ DB URL loaded (length:", databaseUrl.length, ")");

const isProduction = process.env.NODE_ENV === "production";
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isProduction ? { rejectUnauthorized: true } : undefined,
});
export const db = drizzle(pool, { schema });
export { pool };
