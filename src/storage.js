// File storage for vendor bill photos, receipts and the company logo.
// STORAGE=supabase  -> Supabase Storage bucket (use on Vercel)
// STORAGE=local     -> a folder on your own server (UPLOAD_DIR)
const fs = require("fs");
const path = require("path");

let currentMode = (process.env.STORAGE || (process.env.SUPABASE_URL ? "supabase" : "local")).toLowerCase();
let currentBucket = process.env.SUPABASE_BUCKET || "bills";
let currentSupabaseUrl = process.env.SUPABASE_URL || "";
let currentServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let currentUploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads"));

let supa = null;
function getSupabaseClient() {
  if (!supa) {
    const { createClient } = require("@supabase/supabase-js");
    if (!currentSupabaseUrl || !currentServiceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE=supabase");
    }
    supa = createClient(currentSupabaseUrl, currentServiceRoleKey, { auth: { persistSession: false } });
  }
  return supa;
}

function reconfigure({ mode, supabaseUrl, serviceRoleKey, bucket, uploadDir }) {
  if (mode !== undefined) {
    currentMode = mode.toLowerCase();
    process.env.STORAGE = currentMode;
  }
  if (supabaseUrl !== undefined) {
    currentSupabaseUrl = (supabaseUrl || "").trim();
    process.env.SUPABASE_URL = currentSupabaseUrl;
  }
  if (serviceRoleKey !== undefined) {
    currentServiceRoleKey = (serviceRoleKey || "").trim();
    process.env.SUPABASE_SERVICE_ROLE_KEY = currentServiceRoleKey;
  }
  if (bucket !== undefined) {
    currentBucket = (bucket || "bills").trim();
    process.env.SUPABASE_BUCKET = currentBucket;
  }
  if (uploadDir !== undefined) {
    currentUploadDir = path.resolve(uploadDir);
    process.env.UPLOAD_DIR = currentUploadDir;
  }
  supa = null; // reset client instance
}

async function testStorage({ mode, supabaseUrl, serviceRoleKey, bucket }) {
  const targetMode = (mode || (supabaseUrl ? "supabase" : "local")).toLowerCase();
  if (targetMode === "local") {
    return { ok: true, message: "Local storage directory is operational." };
  }
  const sUrl = (supabaseUrl || currentSupabaseUrl || "").trim();
  const sKey = (serviceRoleKey || currentServiceRoleKey || "").trim();
  const sBucket = (bucket || currentBucket || "bills").trim();

  if (!sUrl || !sKey) {
    return { ok: false, error: "Supabase Project URL and Service Role Key are required." };
  }
  try {
    const { createClient } = require("@supabase/supabase-js");
    const client = createClient(sUrl, sKey, { auth: { persistSession: false } });
    const { data, error } = await client.storage.from(sBucket).list("", { limit: 1 });
    if (error) {
      return { ok: false, error: "Supabase Storage Error: " + error.message };
    }
    return { ok: true, message: `Supabase Storage connected! Bucket "${sBucket}" verified.` };
  } catch (e) {
    return { ok: false, error: e.message || "Failed to reach Supabase storage." };
  }
}

function getStatus() {
  return {
    mode: currentMode,
    bucket: currentBucket,
    supabaseUrl: currentSupabaseUrl || null,
    hasServiceKey: !!currentServiceRoleKey,
  };
}

async function put(key, buffer, contentType) {
  if (currentMode === "supabase") {
    const { error } = await getSupabaseClient().storage.from(currentBucket).upload(key, buffer, { contentType, upsert: false });
    if (error) throw error;
    return key;
  }
  const full = path.join(currentUploadDir, key);
  await fs.promises.mkdir(path.dirname(full), { recursive: true });
  await fs.promises.writeFile(full, buffer);
  return key;
}

// Sends the file to the browser: a short-lived signed link (Supabase) or a stream (local).
async function send(res, key, contentType, name) {
  if (currentMode === "supabase") {
    const { data, error } = await getSupabaseClient().storage.from(currentBucket).createSignedUrl(key, 60 * 30);
    if (error) throw error;
    return res.redirect(302, data.signedUrl);
  }
  const full = path.join(currentUploadDir, key);
  if (!full.startsWith(currentUploadDir) || !fs.existsSync(full)) return res.status(404).json({ error: "File not found" });
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, max-age=86400");
  if (name) res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(name)}"`);
  fs.createReadStream(full).pipe(res);
}

async function remove(key) {
  if (currentMode === "supabase") {
    await getSupabaseClient().storage.from(currentBucket).remove([key]);
    return;
  }
  const full = path.join(currentUploadDir, key);
  if (full.startsWith(currentUploadDir)) await fs.promises.unlink(full).catch(() => {});
}

module.exports = {
  put,
  send,
  remove,
  reconfigure,
  testStorage,
  getStatus,
  get MODE() { return currentMode; }
};
