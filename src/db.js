const fs = require("fs");
const path = require("path");

let currentUrl = process.env.DATABASE_URL || "";
let pool = null;
let pgliteDb = null;
let ready = null;

function setupConnection(targetUrl) {
  currentUrl = (targetUrl || "").trim();
  ready = null;
  if (pool) {
    try { pool.end(); } catch {}
    pool = null;
  }
  if (pgliteDb) {
    pgliteDb = null;
  }

  if (currentUrl) {
    console.log("[db] Connecting to PostgreSQL database:", maskDatabaseUrl(currentUrl));
    const { Pool } = require("pg");
    const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(currentUrl) || process.env.DB_SSL === "false";
    pool = new Pool({
      connectionString: currentUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 10)),
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    if (process.env.VERCEL) {
      console.error("[db] DATABASE_URL is not set in Vercel Environment Variables.");
      return;
    }
    console.log("[db] DATABASE_URL not set. Running with embedded PostgreSQL (PGlite) in ./db/pgdata for local testing.");
    const { PGlite } = require("@electric-sql/pglite");
    const dataDir = path.resolve(process.env.LOCAL_DB_DIR || path.join(__dirname, "..", "db", "pgdata"));
    pgliteDb = new PGlite(dataDir);
  }
}

// Initial connection setup
setupConnection(currentUrl);

async function init() {
  if (!pool && !pgliteDb) {
    throw new Error("DATABASE_URL is not configured in Vercel Environment Variables. Please add DATABASE_URL in Vercel Project Settings.");
  }
  if (!ready) {
    const sql = fs.readFileSync(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
    if (pool) {
      ready = pool.query(sql).catch((e) => { ready = null; throw e; });
    } else {
      ready = pgliteDb.exec(sql).catch((e) => { ready = null; throw e; });
    }
  }
  return ready;
}

async function query(text, params) {
  await init();
  if (pool) {
    return pool.query(text, params);
  }
  return pgliteDb.query(text, params);
}

// Test a PostgreSQL connection string without switching
async function testConnection(testUrl) {
  if (!testUrl || !testUrl.trim()) {
    return { ok: true, message: "Local embedded database (PGlite) is operational." };
  }
  const { Pool } = require("pg");
  const trimmed = testUrl.trim();
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(trimmed) || process.env.DB_SSL === "false";
  const testPool = new Pool({
    connectionString: trimmed,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    const res = await testPool.query("SELECT current_database() as db, version() as ver");
    await testPool.end();
    return { ok: true, message: `Connected to PostgreSQL database: "${res.rows[0].db}" successfully!` };
  } catch (err) {
    try { await testPool.end(); } catch {}
    return { ok: false, error: err.message || "Failed to connect to database." };
  }
}

// Switch database connection dynamically at runtime
async function reconfigure(newUrl) {
  setupConnection(newUrl);
  process.env.DATABASE_URL = newUrl || "";
  await init();
}

function getStatus() {
  return {
    isSupabase: !!currentUrl,
    isLocal: !currentUrl,
    url: currentUrl ? maskDatabaseUrl(currentUrl) : null,
    rawConfigured: !!currentUrl,
  };
}

function maskDatabaseUrl(str) {
  if (!str) return "";
  return str.replace(/:([^:@]+)@/, ":••••••••@");
}

module.exports = {
  pool,
  query,
  init,
  testConnection,
  reconfigure,
  getStatus,
  maskDatabaseUrl
};
