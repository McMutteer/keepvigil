import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { createLogger } from "../logger.js";

const { Pool } = pg;
const log = createLogger("migrate");

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  try {
    const db = drizzle(pool);
    log.info("Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    log.info("Migrations complete.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  log.fatal({ err }, "Migration failed");
  process.exit(1);
});
