const path = require("path");
const express = require("express");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.use("/api/files", require("./routes/files"));       // raw upload body, so before json parser
app.use("/api", express.json({ limit: "1mb" }));
app.get("/api/health", (req, res) => res.json({ ok: true, storage: require("./storage").MODE }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/data", require("./routes/data"));
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// On your own server, Express also serves the app's screens. On Vercel the CDN does this.
if (!process.env.VERCEL) {
  const pub = path.join(__dirname, "..", "public");
  app.use(express.static(pub, { extensions: ["html"], maxAge: "1h", setHeaders: (res, p) => { if (/sw\.js$|index\.html$/.test(p)) res.setHeader("Cache-Control", "no-cache"); } }));
  app.get("*", (req, res) => res.sendFile(path.join(pub, "index.html")));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") return res.status(413).json({ error: "File is too large." });
  console.error(err);
  res.status(500).json({ error: "Server error. Please try again." });
});

module.exports = app;
