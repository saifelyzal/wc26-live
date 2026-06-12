import mysql from "mysql2/promise";

type Pool = mysql.Pool;

let pool: Pool | null = null;
let initPromise: Promise<unknown> | null = null;

export function hasMySqlConfig() {
  return Boolean(
    process.env.MYSQL_URL ||
      process.env.MYSQL_DATABASE_URL ||
      process.env.MYSQL_HOST ||
      process.env.DATABASE_URL?.startsWith("mysql"),
  );
}

export function getMySqlPool(): Pool {
  if (pool) return pool;

  const uri =
    process.env.MYSQL_URL ??
    process.env.MYSQL_DATABASE_URL ??
    (process.env.DATABASE_URL?.startsWith("mysql")
      ? process.env.DATABASE_URL
      : undefined);

  if (uri) {
    pool = mysql.createPool({
      uri,
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 5),
      supportBigNumbers: true,
    });
    return pool;
  }

  if (!process.env.MYSQL_HOST) {
    throw new Error("MySQL is not configured");
  }

  pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 5),
    supportBigNumbers: true,
  });
  return pool;
}

export async function initializeDatabase(poolOverride = getMySqlPool()) {
  await poolOverride.execute(`
    CREATE TABLE IF NOT EXISTS match_results (
      fixture_id VARCHAR(64) PRIMARY KEY,
      kickoff DATETIME NULL,
      status VARCHAR(32) NOT NULL,
      score JSON NULL,
      events JSON NULL,
      stats JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await poolOverride.execute(`
    CREATE TABLE IF NOT EXISTS match_recaps (
      id CHAR(36) PRIMARY KEY,
      fixture_id VARCHAR(64) NOT NULL,
      language VARCHAR(8) NOT NULL DEFAULT 'en',
      summary TEXT NULL,
      key_moments JSON NULL,
      stats JSON NULL,
      youtube_video_id VARCHAR(64) NULL,
      official_highlight_url TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY match_recaps_fixture_language_uq (fixture_id, language),
      KEY match_recaps_fixture_idx (fixture_id)
    )
  `);

  return { ok: true, tables: ["match_results", "match_recaps"] };
}

export async function ensureDatabaseInitialized() {
  initPromise ??= initializeDatabase();
  return initPromise;
}
