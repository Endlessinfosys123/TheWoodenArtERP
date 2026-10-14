const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { sign, requireAuth } = require("../auth");
const { newId, ah } = require("../util");

const pub = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: u.active });

// Is this a fresh install that still needs its first admin?
router.get("/status", ah(async (req, res) => {
  const { rows } = await query("select count(*)::int as n from users");
  res.json({ needsSetup: rows[0].n === 0 });
}));

// First run only: create the admin account.
router.post("/setup", ah(async (req, res) => {
  const { name, username, password } = req.body || {};
  if (!name || !username || !password || password.length < 6) return res.status(400).json({ error: "Name, username and a password of at least 6 characters are required." });
  const { rows } = await query("select count(*)::int as n from users");
  if (rows[0].n > 0) return res.status(409).json({ error: "Admin already exists. Please log in." });
  const u = { id: "u_" + newId(16), name: name.trim(), username: username.trim().toLowerCase(), role: "admin", active: true };
  await query("insert into users (id,name,username,password_hash,role,active,created_at) values ($1,$2,$3,$4,$5,true,$6)",
    [u.id, u.name, u.username, await bcrypt.hash(password, 10), "admin", Date.now()]);
  res.json({ token: sign(u), user: pub(u) });
}));

router.post("/login", ah(async (req, res) => {
  const { username, password } = req.body || {};
  const { rows } = await query("select * from users where username=$1", [String(username || "").trim().toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password || ""), u.password_hash))) return res.status(401).json({ error: "Wrong username or password." });
  if (!u.active) return res.status(403).json({ error: "This account is turned off. Ask the admin." });
  res.json({ token: sign(u), user: pub(u) });
}));

router.get("/me", requireAuth, ah(async (req, res) => {
  const { rows } = await query("select * from users where id=$1", [req.user.id]);
  if (!rows[0] || !rows[0].active) return res.status(401).json({ error: "Please log in again." });
  res.json({ user: pub(rows[0]) });
}));

router.post("/password", requireAuth, ah(async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || next.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters." });
  const { rows } = await query("select * from users where id=$1", [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(String(current || ""), rows[0].password_hash))) return res.status(400).json({ error: "Current password is wrong." });
  await query("update users set password_hash=$1 where id=$2", [await bcrypt.hash(next, 10), req.user.id]);
  res.json({ ok: true });
}));

module.exports = router;
