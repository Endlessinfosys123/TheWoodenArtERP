const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { query } = require("../db");
const { requireAuth, requireAdmin } = require("../auth");
const { newId, ah } = require("../util");

const pub = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, active: u.active });
router.use(requireAuth);

router.get("/", ah(async (req, res) => {
  const { rows } = await query("select * from users order by created_at");
  res.json({ users: rows.map(pub) });
}));

router.post("/", requireAdmin, ah(async (req, res) => {
  const { name, username, password, role } = req.body || {};
  if (!name || !username || !password || password.length < 6) return res.status(400).json({ error: "Name, username and a password of at least 6 characters are required." });
  const uname = username.trim().toLowerCase();
  const exists = await query("select 1 from users where username=$1", [uname]);
  if (exists.rows.length) return res.status(409).json({ error: "This username is already taken." });
  const u = { id: "u_" + newId(16), name: name.trim(), username: uname, role: role === "admin" ? "admin" : "staff", active: true };
  await query("insert into users (id,name,username,password_hash,role,active,created_at) values ($1,$2,$3,$4,$5,true,$6)",
    [u.id, u.name, u.username, await bcrypt.hash(password, 10), u.role, Date.now()]);
  res.json({ user: pub(u) });
}));

router.patch("/:id", requireAdmin, ah(async (req, res) => {
  const { name, role, active, password } = req.body || {};
  const { rows } = await query("select * from users where id=$1", [req.params.id]);
  const u = rows[0]; if (!u) return res.status(404).json({ error: "User not found." });
  if (u.id === req.user.id && (active === false || role === "staff")) return res.status(400).json({ error: "You cannot remove your own admin access." });
  if (name) u.name = String(name).trim();
  if (role) u.role = role === "admin" ? "admin" : "staff";
  if (typeof active === "boolean") u.active = active;
  let hash = u.password_hash;
  if (password) { if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." }); hash = await bcrypt.hash(password, 10); }
  await query("update users set name=$1, role=$2, active=$3, password_hash=$4 where id=$5", [u.name, u.role, u.active, hash, u.id]);
  res.json({ user: pub(u) });
}));

module.exports = router;
