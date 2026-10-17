import mysql, { Pool, PoolOptions } from "mysql2/promise";

const DB_HOST = process.env.LOCAL_DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.LOCAL_DB_PORT || 3306);
const DB_USER = process.env.LOCAL_DB_USER || "root";
const DB_PASSWORD = process.env.LOCAL_DB_PASSWORD || "";
const DB_NAME = process.env.LOCAL_DB_NAME || "kumi_offline";

declare global {
  var _mariadbPool: Pool | undefined;
}

const poolOptions: PoolOptions = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

export function getMariaDBPool(): Pool {
  if (!global._mariadbPool) {
    global._mariadbPool = mysql.createPool(poolOptions);
  }
  return global._mariadbPool;
}

/**
 * Checks whether the local MariaDB server is reachable.
 */
export async function isMariaDBConnected(): Promise<boolean> {
  try {
    const pool = getMariaDBPool();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Executes a query with parameters against the local MariaDB database.
 */
export async function mariaQuery<T = any>(sql: string, params: any[] = []): Promise<T> {
  const pool = getMariaDBPool();
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

/**
 * Ensures the `kumi_offline` database exists in XAMPP MariaDB.
 */
export async function ensureDatabaseExists(): Promise<void> {
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } finally {
    await rootConn.end();
  }
}
