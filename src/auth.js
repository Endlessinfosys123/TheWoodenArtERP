const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "";
if (!SECRET || SECRET.length < 16) {
  console.warn("[auth] JWT_SECRET is missing or too short. Set a long random value in your environment.");
}
const secret = () => SECRET || "dev-only-insecure-secret-change-me";

function sign(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, secret(), { expiresIn: "30d" });
}

// Reads the token from "Authorization: Bearer ..." or ?t= (used by <img> tags for bill photos).
function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : (req.query.t || "");
  if (!token) return res.status(401).json({ error: "Please log in." });
  try {
    const p = jwt.verify(token, secret());
    req.user = { id: p.sub, role: p.role, name: p.name };
    next();
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Only an admin can do this." });
  next();
}

module.exports = { sign, requireAuth, requireAdmin };
