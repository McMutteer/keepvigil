import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

export interface DatabaseInstance {
  db: ReturnType<typeof drizzle<typeof schema>>;
  pool: pg.Pool;
}

export function createDb(connectionString: string): DatabaseInstance {
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type Database = DatabaseInstance["db"];

export { schema };
