const express = require("express");
const router = express.Router();
const { query } = require("../db");
const storage = require("../storage");
const { requireAuth } = require("../auth");
const { newId, ah } = require("../util");

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf" };
// Vercel functions accept at most ~4.5 MB per request. Photos are shrunk in the browser before upload.
const LIMIT = process.env.VERCEL ? "4mb" : (process.env.UPLOAD_LIMIT || "20mb");

router.use(requireAuth);

router.post("/", express.raw({ type: () => true, limit: LIMIT }), ah(async (req, res) => {
  const type = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (!TYPES[type]) return res.status(415).json({ error: "Only JPG, PNG, WEBP photos or PDF files." });
  if (!req.body || !req.body.length) return res.status(400).json({ error: "Empty file." });
  const id = newId(24);
  const name = decodeURIComponent(String(req.headers["x-file-name"] || `file.${TYPES[type]}`)).slice(0, 120);
  const d = new Date();
  const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${id}.${TYPES[type]}`;
  await storage.put(key, req.body, type);
  await query("insert into files (id,name,content_type,size_bytes,storage_path,created_at,created_by) values ($1,$2,$3,$4,$5,$6,$7)",
    [id, name, type, req.body.length, key, Date.now(), req.user.id]);
  res.json({ id, url: `/api/files/${id}`, contentType: type, sizeBytes: req.body.length });
}));

router.get("/:id", ah(async (req, res) => {
  const { rows } = await query("select * from files where id=$1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "File not found." });
  await storage.send(res, rows[0].storage_path, rows[0].content_type, rows[0].name);
}));

router.delete("/:id", ah(async (req, res) => {
  const { rows } = await query("select * from files where id=$1", [req.params.id]);
  const f = rows[0]; if (!f) return res.json({ deleted: false });
  if (req.user.role !== "admin" && f.created_by !== req.user.id) return res.status(403).json({ error: "Only the admin or the uploader can delete this file." });
  await storage.remove(f.storage_path);
  await query("delete from files where id=$1", [f.id]);
  res.json({ deleted: true });
}));

module.exports = router;
