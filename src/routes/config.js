const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const db = require("../db");
const storage = require("../storage");
const { requireAuth, requireAdmin } = require("../auth");
const { ah } = require("../util");

router.use(requireAuth);
router.use(requireAdmin);

function updateEnvFile(updates) {
  const envPath = path.resolve(__dirname, "..", "..", ".env");
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }
  const lines = content ? content.split(/\r?\n/) : [];
  const handled = new Set();

  const newLines = lines.map(line => {
    const match = line.match(/^([A-Za-z_0-9]+)\s*=/);
    if (match && updates.hasOwnProperty(match[1])) {
      handled.add(match[1]);
      const val = updates[match[1]];
      return val === null || val === undefined || val === "" ? `# ${match[1]}=` : `${match[1]}=${val}`;
    }
    return line;
  });

  Object.entries(updates).forEach(([key, val]) => {
    if (!handled.has(key) && val !== null && val !== undefined && val !== "") {
      newLines.push(`${key}=${val}`);
    }
  });

  fs.writeFileSync(envPath, newLines.join("\n").trim() + "\n", "utf8");
}

// 1. Get current database & storage configuration status
router.get("/database", ah(async (req, res) => {
  res.json({
    db: db.getStatus(),
    storage: storage.getStatus()
  });
}));

// 2. Test database & storage credentials without saving
router.post("/database/test", ah(async (req, res) => {
  const { databaseUrl, supabaseUrl, supabaseServiceRoleKey, supabaseBucket, storageMode } = req.body || {};

  const dbRes = await db.testConnection(databaseUrl);
  if (!dbRes.ok) {
    return res.status(400).json({ ok: false, step: "database", error: dbRes.error });
  }

  let storageRes = { ok: true, message: "Storage configuration ok." };
  if (storageMode === "supabase" || (!storageMode && supabaseUrl)) {
    storageRes = await storage.testStorage({
      mode: "supabase",
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      bucket: supabaseBucket || "bills"
    });
    if (!storageRes.ok) {
      return res.status(400).json({ ok: false, step: "storage", dbMessage: dbRes.message, error: storageRes.error });
    }
  }

  res.json({
    ok: true,
    dbMessage: dbRes.message,
    storageMessage: storageRes.message
  });
}));

// 3. Save configuration, re-initialize database, and migrate schema
router.post("/database/save", ah(async (req, res) => {
  const { databaseUrl, supabaseUrl, supabaseServiceRoleKey, supabaseBucket, storageMode, copyAdmin } = req.body || {};

  // Check current admin user in case new DB is empty
  let currentAdmin = null;
  try {
    const adminQuery = await db.query("select * from users where id=$1", [req.user.id]);
    currentAdmin = adminQuery.rows[0];
  } catch {}

  // Test the new connection first
  const dbTest = await db.testConnection(databaseUrl);
  if (!dbTest.ok) {
    return res.status(400).json({ ok: false, error: "Database connection failed: " + dbTest.error });
  }

  const sMode = (storageMode || (supabaseUrl ? "supabase" : "local")).toLowerCase();
  if (sMode === "supabase") {
    const sTest = await storage.testStorage({
      mode: "supabase",
      supabaseUrl,
      serviceRoleKey: supabaseServiceRoleKey,
      bucket: supabaseBucket || "bills"
    });
    if (!sTest.ok) {
      return res.status(400).json({ ok: false, error: "Storage verification failed: " + sTest.error });
    }
  }

  // Update .env file
  updateEnvFile({
    DATABASE_URL: databaseUrl ? databaseUrl.trim() : null,
    STORAGE: sMode,
    SUPABASE_URL: supabaseUrl ? supabaseUrl.trim() : null,
    SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey ? supabaseServiceRoleKey.trim() : null,
    SUPABASE_BUCKET: supabaseBucket ? supabaseBucket.trim() : "bills"
  });

  // Reconfigure database connection live
  await db.reconfigure(databaseUrl ? databaseUrl.trim() : "");

  // Reconfigure storage live
  storage.reconfigure({
    mode: sMode,
    supabaseUrl: supabaseUrl ? supabaseUrl.trim() : "",
    serviceRoleKey: supabaseServiceRoleKey ? supabaseServiceRoleKey.trim() : "",
    bucket: supabaseBucket ? supabaseBucket.trim() : "bills"
  });

  // Ensure tables exist on the new database
  await db.init();

  // If the new database has 0 users, copy the current admin user over so session doesn't break
  if (currentAdmin) {
    try {
      const userCount = await db.query("select count(*)::int as n from users");
      if (userCount.rows[0].n === 0) {
        await db.query(
          "insert into users (id,name,username,password_hash,role,active,created_at) values ($1,$2,$3,$4,$5,true,$6)",
          [currentAdmin.id, currentAdmin.name, currentAdmin.username, currentAdmin.password_hash, currentAdmin.role, Date.now()]
        );
        console.log(`[db] Preserved admin user "${currentAdmin.username}" into the newly connected database.`);
      }
    } catch (e) {
      console.warn("[db] Could not sync admin user to new database:", e.message);
    }
  }

  res.json({
    ok: true,
    message: databaseUrl ? "Connected to Supabase PostgreSQL successfully! Tables verified." : "Switched to local embedded database (PGlite).",
    db: db.getStatus(),
    storage: storage.getStatus()
  });
}));

module.exports = router;
