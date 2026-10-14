const fs = require("fs");
const path = require("path");

const url = process.env.DATABASE_URL || "";
let pool = null;
let pgliteDb = null;

if (url) {
  const { Pool } = require("pg");
  const isLocal = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url) || process.env.DB_SSL === "false";
  pool = new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || (process.env.VERCEL ? 1 : 10)),
    idleTimeoutMillis: 10000,
  });
} else {
  console.log("[db] DATABASE_URL not set. Running with embedded PostgreSQL (PGlite) in ./db/pgdata for local testing.");
  const { PGlite } = require("@electric-sql/pglite");
  const dataDir = path.resolve(process.env.LOCAL_DB_DIR || path.join(__dirname, "..", "db", "pgdata"));
  pgliteDb = new PGlite(dataDir);
}

let ready = null;
function init() {
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

module.exports = { pool, query, init };

