// File storage for vendor bill photos, receipts and the company logo.
// STORAGE=supabase  -> Supabase Storage bucket (use on Vercel)
// STORAGE=local     -> a folder on your own server (UPLOAD_DIR)
const fs = require("fs");
const path = require("path");

const MODE = (process.env.STORAGE || (process.env.SUPABASE_URL ? "supabase" : "local")).toLowerCase();
const BUCKET = process.env.SUPABASE_BUCKET || "bills";
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"));

let supa = null;
function supabase() {
  if (!supa) {
    const { createClient } = require("@supabase/supabase-js");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE=supabase");
    }
    supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  }
  return supa;
}

async function put(key, buffer, contentType) {
  if (MODE === "supabase") {
    const { error } = await supabase().storage.from(BUCKET).upload(key, buffer, { contentType, upsert: false });
    if (error) throw error;
    return key;
  }
  const full = path.join(UPLOAD_DIR, key);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
  return key;
}

// Sends the file to the browser: a short-lived signed link (Supabase) or a stream (local).
async function send(res, key, contentType, name) {
  if (MODE === "supabase") {
    const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(key, 60 * 30);
    if (error) throw error;
    return res.redirect(302, data.signedUrl);
  }
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR) || !fs.existsSync(full)) return res.status(404).json({ error: "File not found" });
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, max-age=86400");
  if (name) res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
  fs.createReadStream(full).pipe(res);
}

async function remove(key) {
  if (MODE === "supabase") { await supabase().storage.from(BUCKET).remove([key]); return; }
  const full = path.join(UPLOAD_DIR, key);
  if (full.startsWith(UPLOAD_DIR)) await fs.promises.unlink(full).catch(() => {});
}

module.exports = { put, send, remove, MODE };
