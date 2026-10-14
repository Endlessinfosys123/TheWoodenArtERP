// Creates all tables. Usage: npm run db:init
require("dotenv").config();
const { init, pool } = require("../src/db");
init().then(() => { console.log("Database tables are ready."); return pool.end(); })
  .catch((e) => { console.error("Failed:", e.message); process.exit(1); });
