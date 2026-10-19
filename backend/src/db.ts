import mysql from "mysql2/promise";

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "appuser",
  password: process.env.DB_PASSWORD ?? "apppassword",
  database: process.env.DB_NAME ?? "appdb",
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until MySQL accepts connections (schema is created by db/init.sql). */
export async function initDb(retries = 20): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Database ready");
      return;
    } catch {
      console.log(`Database not ready (attempt ${attempt}/${retries}), retrying...`);
      await sleep(3000);
    }
  }
  throw new Error("Could not connect to the database");
}
