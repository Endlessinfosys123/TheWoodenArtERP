const crypto = require("crypto");
const newId = (n = 20) => crypto.randomBytes(n).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, n);
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { newId, ah };
