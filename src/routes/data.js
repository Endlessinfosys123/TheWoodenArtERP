// Generic records API used by the app: invoices, quotations, money entries, stock, vendors, bills.
const router = require("express").Router();
const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../auth");
const { newId, ah } = require("../util");

// App collection name -> database table
const TABLES = {
  invoices: "invoices", quotes: "quotations", txns: "transactions", materials: "materials",
  moves: "stock_moves", vendors: "vendors", bills: "vendor_bills",
};
const MAX_BYTES = 256 * 1024;

router.use(requireAuth);

const table = (req, res) => {
  const t = TABLES[req.params.col];
  if (!t) { res.status(404).json({ error: "Unknown collection." }); return null; }
  return t;
};
const clean = (o) => {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const c = { ...o }; delete c.id; return c;
};
const row = (r) => ({ id: r.id, ...r.data, createdAt: Number(r.created_at) });

// Everything the app needs on open, in one request.
router.get("/", ah(async (req, res) => {
  const out = {};
  await Promise.all(Object.entries(TABLES).map(async ([col, t]) => {
    const { rows } = await query(`select id, data, created_at from ${t} order by created_at desc limit 5000`);
    out[col] = rows.map(row);
  }));
  const s = await query("select data from settings where id='company'");
  out.settings = s.rows[0]?.data || {};
  res.json(out);
}));

router.put("/settings", requireAdmin, ah(async (req, res) => {
  const d = clean(req.body); if (!d) return res.status(400).json({ error: "Invalid settings." });
  await query("insert into settings (id,data,updated_at) values ('company',$1,$2) on conflict (id) do update set data=excluded.data, updated_at=excluded.updated_at", [d, Date.now()]);
  res.json({ settings: d });
}));

router.get("/:col", ah(async (req, res) => {
  const t = table(req, res); if (!t) return;
  const { rows } = await query(`select id, data, created_at from ${t} order by created_at desc limit 5000`);
  res.json({ items: rows.map(row) });
}));

// Create (id optional)
router.post("/:col", ah(async (req, res) => {
  const t = table(req, res); if (!t) return;
  const d = clean(req.body); if (!d) return res.status(400).json({ error: "Invalid data." });
  if (JSON.stringify(d).length > MAX_BYTES) return res.status(413).json({ error: "Entry is too large." });
  const id = (req.body.id && /^[A-Za-z0-9_-]{4,64}$/.test(req.body.id)) ? req.body.id : newId();
  const created = Number(d.createdAt) || Date.now(); delete d.createdAt;
  d.by = req.user.id;
  await query(`insert into ${t} (id,data,created_at,updated_at,created_by) values ($1,$2,$3,$3,$4)`, [id, d, created, req.user.id]);
  res.json({ item: { id, ...d, createdAt: created } });
}));

// Replace whole record (creates it if missing)
router.put("/:col/:id", ah(async (req, res) => {
  const t = table(req, res); if (!t) return;
  const d = clean(req.body); if (!d) return res.status(400).json({ error: "Invalid data." });
  if (JSON.stringify(d).length > MAX_BYTES) return res.status(413).json({ error: "Entry is too large." });
  const created = Number(d.createdAt) || Date.now(); delete d.createdAt;
  const { rows } = await query(
    `insert into ${t} (id,data,created_at,updated_at,created_by) values ($1,$2,$3,$4,$5)
     on conflict (id) do update set data=excluded.data, updated_at=excluded.updated_at
     returning id, data, created_at`, [req.params.id, { by: req.user.id, ...d }, created, Date.now(), req.user.id]);
  res.json({ item: row(rows[0]) });
}));

// Merge top-level fields into an existing record
router.patch("/:col/:id", ah(async (req, res) => {
  const t = table(req, res); if (!t) return;
  const d = clean(req.body); if (!d) return res.status(400).json({ error: "Invalid data." });
  delete d.createdAt; delete d.by;
  const { rows } = await query(`update ${t} set data = data || $1::jsonb, updated_at=$2 where id=$3 returning id, data, created_at`, [d, Date.now(), req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Not found. It may have been deleted." });
  res.json({ item: row(rows[0]) });
}));

router.delete("/:col/:id", requireAdmin, ah(async (req, res) => {
  const t = table(req, res); if (!t) return;
  await query(`delete from ${t} where id=$1`, [req.params.id]);
  res.json({ ok: true });
}));

module.exports = router;
