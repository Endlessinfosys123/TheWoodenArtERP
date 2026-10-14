/* Khata Desk — connects the app to your own backend (/api).
   It offers the same small interface the app uses everywhere (use("db"), use("user"),
   use("assets"), use("downloads")), plus the login screen. */
(function () {
  "use strict";
  const API = "/api";
  const COLS = ["invoices", "quotes", "txns", "materials", "moves", "vendors", "bills"];
  const TOKEN_KEY = "khata_token";
  const POLL_MS = 20000;

  let token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch {}
  let me = null;
  let usersCache = null;
  const cache = {};               // col -> Map(id -> record)
  let settings = null;
  const colListeners = {};        // col -> [fn]
  const settingsListeners = [];
  let writeSeq = 0;               // ignore a poll that started before our latest write
  let polling = false;

  /* ---------- HTTP ---------- */
  async function req(method, path, body, raw) {
    const headers = {};
    if (token) headers.Authorization = "Bearer " + token;
    let payload;
    if (raw) { headers["Content-Type"] = raw.type; headers["X-File-Name"] = encodeURIComponent(raw.name || "file"); payload = raw.blob; }
    else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
    let r;
    try { r = await fetch(API + path, { method, headers, body: payload }); }
    catch { throw { code: "unavailable", status: 0, message: "No internet connection. Try again." }; }
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !path.startsWith("/auth/")) { logout(); }
    if (!r.ok) {
      const code = r.status === 403 ? "forbidden" : r.status === 413 ? "too_large" : r.status === 415 ? "unsupported_type" : r.status >= 500 ? "unavailable" : "invalid_argument";
      throw { code, status: r.status, message: j.error || "Something went wrong." };
    }
    return j;
  }
  const genId = () => {
    const a = new Uint8Array(15); crypto.getRandomValues(a);
    return Array.from(a, (b) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[b % 62]).join("");
  };

  /* ---------- local cache + listeners ---------- */
  function snapCol(col) {
    const docs = [...(cache[col] || new Map()).values()]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map((d) => ({ id: d.id, exists: true, data: () => d, metadata: {} }));
    return { docs, size: docs.length, empty: !docs.length, metadata: {}, docChanges: () => [] };
  }
  const emitCol = (col) => (colListeners[col] || []).forEach((f) => f(snapCol(col)));
  const snapSettings = () => ({ id: "settings", exists: !!settings && Object.keys(settings).length > 0, data: () => settings || {}, metadata: {} });
  const emitSettings = () => settingsListeners.forEach((f) => f(snapSettings()));
  function putLocal(col, item) { (cache[col] ||= new Map()).set(item.id, item); writeSeq++; emitCol(col); }

  async function pull() {
    if (polling || !token) return;
    polling = true; const seq = writeSeq;
    try {
      const j = await req("GET", "/data");
      if (seq !== writeSeq) return;   // a save happened meanwhile; next poll will catch up
      COLS.forEach((c) => { cache[c] = new Map((j[c] || []).map((d) => [d.id, d])); emitCol(c); });
      settings = j.settings || {}; emitSettings();
    } catch (e) { console.warn("sync failed", e); }
    finally { polling = false; }
  }
  setInterval(() => { if (!document.hidden && me) pull(); }, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && me) pull(); });

  function docRef(col, id) {
    return {
      id, path: col + "/" + id,
      async set(o) { const j = await req("PUT", `/data/${col}/${id}`, o); putLocal(col, j.item); },
      async update(o) { const j = await req("PATCH", `/data/${col}/${id}`, o); putLocal(col, j.item); },
      async delete() { await req("DELETE", `/data/${col}/${id}`); cache[col]?.delete(id); writeSeq++; emitCol(col); },
      onSnapshot(next) {
        const f = () => { const d = cache[col]?.get(id); next({ id, exists: !!d, data: () => d, metadata: {} }); };
        (colListeners[col] ||= []).push(f); setTimeout(f, 0); return () => {};
      },
    };
  }

  const db = {
    doc(path) {
      if (path === "app/settings") {
        return {
          id: "settings", path,
          onSnapshot(next) { settingsListeners.push(next); if (settings) setTimeout(() => next(snapSettings()), 0); return () => {}; },
          async set(o) { const j = await req("PUT", "/data/settings", o); settings = j.settings; writeSeq++; emitSettings(); },
          async update(o) { const j = await req("PUT", "/data/settings", { ...(settings || {}), ...o }); settings = j.settings; writeSeq++; emitSettings(); },
        };
      }
      const [col, id] = path.split("/"); return docRef(col, id);
    },
    collection(col) {
      const q = {
        path: col,
        orderBy() { return q; }, limit() { return q; }, where() { return q; },
        onSnapshot(next) { (colListeners[col] ||= []).push(next); if (cache[col]) setTimeout(() => next(snapCol(col)), 0); return () => {}; },
        doc(id) { return docRef(col, id || genId()); },
        async add(o) { const r = docRef(col, genId()); await r.set(o); return r; },
      };
      return q;
    },
  };

  /* ---------- user ---------- */
  async function loadUsers() {
    if (!usersCache) { try { usersCache = (await req("GET", "/users")).users; } catch { usersCache = []; } }
    return usersCache;
  }
  const user = {
    async id() { return me?.id || null; },
    async can(name) { return name === "data.write" ? !!me : me?.role === "admin"; },
    async canEdit() { return me?.role === "admin"; },
    async isOwner() { return me?.role === "admin"; },
    async me() { return { id: me?.id, name: me?.name || "", isOwner: me?.role === "admin", canEdit: me?.role === "admin" }; },
    async name() { return me?.name || ""; },
    async profiles(ids) {
      const list = await loadUsers(); const out = {};
      [].concat(ids).forEach((id) => { const u = list.find((x) => x.id === id); out[id] = { id, name: u?.name || "", isMe: id === me?.id }; });
      return out;
    },
  };

  /* ---------- files ---------- */
  const assets = {
    async upload(blob, opts = {}) {
      const type = opts.type || blob.type;
      return req("POST", "/files", undefined, { blob, type, name: blob.name || "file" });
    },
    async delete(id) { return req("DELETE", "/files/" + encodeURIComponent(id)); },
    async list() { return { assets: [], usage: {} }; },
  };

  /* ---------- downloads ---------- */
  const downloads = {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.csv$/.test(filename) ? "text/csv" : /\.json$/.test(filename) ? "application/json" : "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return { status: "saved" };
    },
  };

  /* ---------- login screen ---------- */
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function authScreen(setup) {
    return new Promise((resolve) => {
      const el = document.createElement("div");
      el.className = "auth";
      el.innerHTML = `<div class="auth-card">
        <div class="mark" style="width:44px;height:44px;font-size:22px">K</div>
        <h2>${setup ? "Set up Khata Desk" : "Log in"}</h2>
        <p>${setup ? "Create the admin account. You can add your team's logins later from Settings." : "Use the username and password your admin gave you."}</p>
        <form id="authForm" autocomplete="on">
          ${setup ? `<label class="f"><span>Your name</span><input name="name" required autocomplete="name"></label>` : ""}
          <label class="f"><span>Username</span><input name="username" required autocapitalize="none" autocomplete="username"></label>
          <label class="f"><span>Password${setup ? " (min 6)" : ""}</span><input name="password" type="password" required ${setup ? 'minlength="6" autocomplete="new-password"' : 'autocomplete="current-password"'}></label>
          <div class="auth-err" id="authErr"></div>
          <button class="btn pri" type="submit">${setup ? "Create admin & start" : "Log in"}</button>
        </form></div>`;
      document.body.appendChild(el);
      const form = el.querySelector("#authForm");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button"); btn.disabled = true; el.querySelector("#authErr").textContent = "";
        try {
          const body = { username: form.username.value, password: form.password.value };
          if (setup) body.name = form.name.value;
          const j = await req("POST", setup ? "/auth/setup" : "/auth/login", body);
          token = j.token; me = j.user;
          try { localStorage.setItem(TOKEN_KEY, token); } catch {}
          el.remove(); resolve();
        } catch (err) { el.querySelector("#authErr").textContent = err.message || "Could not log in."; btn.disabled = false; }
      });
      setTimeout(() => form.querySelector("input").focus(), 50);
    });
  }

  async function ensureAuth() {
    if (token) {
      try { me = (await req("GET", "/auth/me")).user; }
      catch (e) { if (e.status === 401) { token = ""; } else { document.body.insertAdjacentHTML("afterbegin", `<div class="banner" style="margin:12px">Cannot reach the server: ${esc(e.message)}</div>`); throw e; } }
    }
    if (!me) {
      let status = { needsSetup: false };
      try { status = await req("GET", "/auth/status"); }
      catch (e) { document.body.insertAdjacentHTML("afterbegin", `<div class="banner" style="margin:12px">Cannot reach the server. Check DATABASE_URL and that the backend is running. (${esc(e.message)})</div>`); throw e; }
      await authScreen(status.needsSetup);
    }
    pull();
    return me;
  }

  function logout() {
    token = ""; me = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    location.reload();
  }

  window.KhataRest = {
    async use(name) { return { db, user, assets, downloads }[name] || null; },
    ensureAuth,
    logout,
    fileUrl: (id) => `${API}/files/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`,
    changePassword: (current, next) => req("POST", "/auth/password", { current, next }),
    users: {
      list: async () => { usersCache = (await req("GET", "/users")).users; return usersCache; },
      create: async (u) => { const j = await req("POST", "/users", u); usersCache = null; return j.user; },
      update: async (id, patch) => { const j = await req("PATCH", "/users/" + encodeURIComponent(id), patch); usersCache = null; return j.user; },
    },
    config: {
      getDatabase: () => req("GET", "/config/database"),
      testDatabase: (data) => req("POST", "/config/database/test", data),
      saveDatabase: (data) => req("POST", "/config/database/save", data),
    },
  };
})();
