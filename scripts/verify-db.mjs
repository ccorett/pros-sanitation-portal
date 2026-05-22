import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("FAIL: DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

try {
  const [row] = await sql`
    SELECT
      current_database() AS database,
      current_user AS user,
      version() AS version,
      now() AS server_time
  `;
  console.log("OK: Connected to Neon PostgreSQL");
  console.log(JSON.stringify(row, null, 2));
} catch (error) {
  console.error("FAIL: Could not connect to database");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
