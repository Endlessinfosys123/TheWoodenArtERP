/* Khata Desk — Screen Lock System (PIN & Biometric WebAuthn) */
(function () {
  "use strict";

  const STORAGE_KEYS = {
    ENABLED: "khata_lock_enabled",
    PIN_HASH: "khata_lock_pin_hash",
    PIN_SALT: "khata_lock_pin_salt",
    BIO_ENABLED: "khata_bio_enabled",
    BIO_CRED_ID: "khata_bio_cred_id",
    AUTO_LOCK: "khata_lock_autotime", // "0"=instant, "60000"=1m, "300000"=5m, "never"
    PROMPTED: "khata_bio_prompted_once"
  };

  let isLockedState = false;
  let enteredPin = "";
  let lastActiveTime = Date.now();
  let inactivityTimer = null;
  let bioAvailableCache = null;

  /* ---------- Cryptography (Web Crypto API) ---------- */
  async function hashPin(pin, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(pin + ":" + salt);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function genSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- Biometric Support (WebAuthn Platform Authenticator) ---------- */
  async function isBiometricAvailable() {
    if (bioAvailableCache !== null) return bioAvailableCache;
    if (!window.PublicKeyCredential) {
      bioAvailableCache = false;
      return false;
    }
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
        bioAvailableCache = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return bioAvailableCache;
      }
    } catch {
      bioAvailableCache = false;
    }
    return false;
  }

  async function registerBiometrics(username) {
    if (!(await isBiometricAvailable())) {
      throw new Error("Biometric authentication is not supported on this device.");
    }
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Khata Desk ERP", id: window.location.hostname },
        user: {
          id: userId,
          name: username || "user",
          displayName: username || "Khata User"
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000
      }
    });

    if (!cred || !cred.rawId) throw new Error("Biometric enrollment cancelled.");
    const idBase64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
    localStorage.setItem(STORAGE_KEYS.BIO_CRED_ID, idBase64);
    localStorage.setItem(STORAGE_KEYS.BIO_ENABLED, "true");
    return true;
  }

  async function verifyBiometrics() {
    if (!(await isBiometricAvailable())) return false;
    const credIdBase64 = localStorage.getItem(STORAGE_KEYS.BIO_CRED_ID);
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const allowCredentials = credIdBase64 ? [{
      type: "public-key",
      id: Uint8Array.from(atob(credIdBase64), c => c.charCodeAt(0))
    }] : [];

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: allowCredentials.length ? allowCredentials : undefined,
          userVerification: "required",
          timeout: 60000
        }
      });
      return !!assertion;
    } catch (e) {
      console.warn("Biometric verification cancelled/failed:", e);
      return false;
    }
  }

  /* ---------- Lock State & Config ---------- */
  function isLockEnabled() {
    return localStorage.getItem(STORAGE_KEYS.ENABLED) === "true" && !!localStorage.getItem(STORAGE_KEYS.PIN_HASH);
  }

  function isBioEnabled() {
    return isLockEnabled() && localStorage.getItem(STORAGE_KEYS.BIO_ENABLED) === "true";
  }

  function getAutoLockSetting() {
    return localStorage.getItem(STORAGE_KEYS.AUTO_LOCK) || "0"; // default: immediately on app leave
  }

  async function setPin(pin) {
    if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits.");
    const salt = genSalt();
    const hash = await hashPin(pin, salt);
    localStorage.setItem(STORAGE_KEYS.PIN_SALT, salt);
    localStorage.setItem(STORAGE_KEYS.PIN_HASH, hash);
    localStorage.setItem(STORAGE_KEYS.ENABLED, "true");
    return true;
  }

  async function verifyPin(pin) {
    const salt = localStorage.getItem(STORAGE_KEYS.PIN_SALT) || "";
    const expected = localStorage.getItem(STORAGE_KEYS.PIN_HASH) || "";
    if (!salt || !expected) return false;
    const computed = await hashPin(pin, salt);
    return computed === expected;
  }

  function disableLock() {
    localStorage.removeItem(STORAGE_KEYS.ENABLED);
    localStorage.removeItem(STORAGE_KEYS.PIN_HASH);
    localStorage.removeItem(STORAGE_KEYS.PIN_SALT);
    localStorage.removeItem(STORAGE_KEYS.BIO_ENABLED);
    localStorage.removeItem(STORAGE_KEYS.BIO_CRED_ID);
    unlock();
  }

  /* ---------- Overlay UI ---------- */
  function getOverlayEl() {
    let el = document.getElementById("screenLockOverlay");
    if (!el) {
      el = document.createElement("div");
      el.id = "screenLockOverlay";
      el.className = "screen-lock-overlay";
      document.body.appendChild(el);
    }
    return el;
  }

  function renderOverlay() {
    const el = getOverlayEl();
    const hasBio = isBioEnabled();
    el.innerHTML = `
      <div class="lock-box">
        <div class="lock-brand">
          <div class="lock-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2>Khata Desk Locked</h2>
          <p id="lockSubtitle">${hasBio ? "Use Fingerprint / Face or enter PIN" : "Enter your 4-digit security PIN"}</p>
        </div>

        <div class="pin-display" id="pinDots">
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
          <span class="pin-dot"></span>
        </div>

        <div class="lock-status" id="lockStatus"></div>

        <div class="keypad">
          <button type="button" class="key-btn" data-key="1">1</button>
          <button type="button" class="key-btn" data-key="2">2</button>
          <button type="button" class="key-btn" data-key="3">3</button>
          <button type="button" class="key-btn" data-key="4">4</button>
          <button type="button" class="key-btn" data-key="5">5</button>
          <button type="button" class="key-btn" data-key="6">6</button>
          <button type="button" class="key-btn" data-key="7">7</button>
          <button type="button" class="key-btn" data-key="8">8</button>
          <button type="button" class="key-btn" data-key="9">9</button>
          <button type="button" class="key-btn act-btn ${hasBio ? "" : "empty"}" id="btnBioTrigger" title="Biometric unlock">
            ${hasBio ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22A10 10 0 0 1 2 12"/><path d="M9 12v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-6 0Z"/><path d="M14 7.5a6 6 0 0 1 4 4.5v1"/><path d="M12 22a10 10 0 0 0 8.5-5"/></svg>` : ""}
          </button>
          <button type="button" class="key-btn" data-key="0">0</button>
          <button type="button" class="key-btn act-btn" id="btnPinBack" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
          </button>
        </div>

        <div class="lock-footer">
          <button type="button" class="link-btn" id="btnForgotPin">Forgot PIN?</button>
        </div>
      </div>
    `;

    // Keypad events
    el.querySelectorAll(".key-btn[data-key]").forEach(b => {
      b.addEventListener("click", () => handleKey(b.dataset.key));
    });
    el.querySelector("#btnPinBack")?.addEventListener("click", () => handleBackspace());
    el.querySelector("#btnBioTrigger")?.addEventListener("click", () => triggerBioUnlock());
    el.querySelector("#btnForgotPin")?.addEventListener("click", () => handleForgotPin());
  }

  function updateDots() {
    const dots = document.querySelectorAll("#pinDots .pin-dot");
    dots.forEach((dot, idx) => {
      dot.classList.toggle("filled", idx < enteredPin.length);
    });
  }

  function vibrate(ms = 40) {
    try { navigator.vibrate?.(ms); } catch {}
  }

  function setStatus(msg, isError = false) {
    const s = document.getElementById("lockStatus");
    if (!s) return;
    s.textContent = msg;
    s.classList.toggle("err", isError);
  }

  function shakeDots() {
    vibrate([60, 40, 60]);
    const d = document.getElementById("pinDots");
    if (!d) return;
    d.classList.add("shake");
    setTimeout(() => d.classList.remove("shake"), 500);
  }

  async function handleKey(num) {
    if (enteredPin.length >= 4) return;
    vibrate(30);
    enteredPin += num;
    updateDots();

    if (enteredPin.length === 4) {
      setStatus("Verifying PIN…");
      const ok = await verifyPin(enteredPin);
      if (ok) {
        setStatus("Unlocked!", false);
        vibrate(40);
        setTimeout(unlock, 150);
      } else {
        shakeDots();
        setStatus("Incorrect PIN. Try again.", true);
        setTimeout(() => {
          enteredPin = "";
          updateDots();
          setStatus("");
        }, 600);
      }
    }
  }

  function handleBackspace() {
    if (!enteredPin.length) return;
    vibrate(20);
    enteredPin = enteredPin.slice(0, -1);
    updateDots();
    setStatus("");
  }

  async function triggerBioUnlock() {
    if (!isBioEnabled()) return;
    setStatus("Scanning Biometrics…");
    const ok = await verifyBiometrics();
    if (ok) {
      setStatus("Unlocked!", false);
      vibrate(50);
      setTimeout(unlock, 150);
    } else {
      setStatus("Biometric verification cancelled or failed. Use PIN.", true);
    }
  }

  function handleForgotPin() {
    const choice = confirm("Forgot PIN?\\n\\nYou can log out and log in again with your account password to reset your screen lock PIN.\\n\\nWould you like to log out now?");
    if (choice) {
      try { localStorage.removeItem("khata_token"); } catch {}
      disableLock();
      window.location.reload();
    }
  }

  /* ---------- Keyboard Listener ---------- */
  function onKeyDown(e) {
    if (!isLockedState) return;
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      handleKey(e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === "Escape") {
      enteredPin = "";
      updateDots();
    }
  }

  /* ---------- Lock & Unlock Commands ---------- */
  function lock() {
    if (!isLockEnabled()) return;
    isLockedState = true;
    enteredPin = "";
    const el = getOverlayEl();
    renderOverlay();
    el.removeAttribute("hidden");
    document.body.classList.add("khata-locked");
    window.addEventListener("keydown", onKeyDown);

    // Auto-prompt biometric if enabled
    if (isBioEnabled()) {
      setTimeout(triggerBioUnlock, 250);
    }
  }

  function unlock() {
    isLockedState = false;
    enteredPin = "";
    lastActiveTime = Date.now();
    const el = getOverlayEl();
    el.setAttribute("hidden", "true");
    document.body.classList.remove("khata-locked");
    window.removeEventListener("keydown", onKeyDown);
  }

  /* ---------- Inactivity & Visibility Tracking ---------- */
  function updateActivity() {
    lastActiveTime = Date.now();
  }

  function setupAutoLockListeners() {
    ["pointerdown", "keydown", "touchstart", "scroll"].forEach(ev => {
      window.addEventListener(ev, updateActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (!isLockEnabled()) return;
      const setting = getAutoLockSetting();
      if (setting === "never") return;

      if (document.visibilityState === "hidden") {
        lastActiveTime = Date.now();
        if (setting === "0") {
          lock();
        }
      } else if (document.visibilityState === "visible") {
        if (setting !== "0") {
          const timeoutMs = parseInt(setting, 10);
          if (Date.now() - lastActiveTime >= timeoutMs) {
            lock();
          }
        }
      }
    });

    // Background interval check for inactivity
    clearInterval(inactivityTimer);
    inactivityTimer = setInterval(() => {
      if (!isLockEnabled() || isLockedState) return;
      const setting = getAutoLockSetting();
      if (setting === "never" || setting === "0") return;
      const timeoutMs = parseInt(setting, 10);
      if (Date.now() - lastActiveTime >= timeoutMs) {
        lock();
      }
    }, 15000);
  }

  /* ---------- Setup & Settings Modals ---------- */
  async function promptBiometricOffer(username) {
    const supported = await isBiometricAvailable();
    if (!supported) return false;
    if (localStorage.getItem(STORAGE_KEYS.PROMPTED)) return false;
    localStorage.setItem(STORAGE_KEYS.PROMPTED, "true");

    const modal = document.createElement("div");
    modal.className = "bio-offer-scrim";
    modal.innerHTML = `
      <div class="bio-offer-card">
        <div class="bio-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/>
            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
            <path d="M8.65 22A10 10 0 0 1 2 12"/>
            <path d="M9 12v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-6 0Z"/>
            <path d="M14 7.5a6 6 0 0 1 4 4.5v1"/>
            <path d="M12 22a10 10 0 0 0 8.5-5"/>
          </svg>
        </div>
        <h3>Enable Biometric Lock?</h3>
        <p>Your device supports <b>Fingerprint / Face Unlock</b>. Protect your business books with instant biometric access & 4-digit PIN fallback.</p>
        <div class="bio-offer-btns">
          <button type="button" class="btn pri" id="btnAcceptBio">Enable Biometric & PIN</button>
          <button type="button" class="btn" id="btnDeclineBio">Maybe Later</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    return new Promise(resolve => {
      modal.querySelector("#btnAcceptBio").addEventListener("click", () => {
        modal.remove();
        openSetupDialog(username);
        resolve(true);
      });
      modal.querySelector("#btnDeclineBio").addEventListener("click", () => {
        modal.remove();
        resolve(false);
      });
    });
  }

  function openSetupDialog(username) {
    const isSupportedPromise = isBiometricAvailable();
    const scrim = document.createElement("div");
    scrim.className = "bio-offer-scrim";
    scrim.innerHTML = `
      <div class="bio-offer-card">
        <div class="lock-brand" style="margin-bottom:14px">
          <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
          <h3 style="margin:8px 0 4px">Set Up Screen Lock</h3>
          <p style="font-size:13px;color:var(--muted);margin:0">Create a 4-digit security PIN for your account.</p>
        </div>

        <form id="lockSetupForm" style="display:flex;flex-direction:column;gap:12px;text-align:left">
          <label class="f full">
            <span>New 4-digit PIN</span>
            <input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin1" required placeholder="••••" style="font-size:20px;letter-spacing:6px;text-align:center">
          </label>
          <label class="f full">
            <span>Confirm 4-digit PIN</span>
            <input type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" name="pin2" required placeholder="••••" style="font-size:20px;letter-spacing:6px;text-align:center">
          </label>

          <div id="bioOptionWrap" style="display:none;background:var(--surface-2);padding:10px 12px;border-radius:10px;margin-top:4px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:13.5px;font-weight:500">
              <input type="checkbox" id="chkEnableBio" checked style="width:18px;height:18px">
              <span>Also enable Fingerprint / Face Unlock</span>
            </label>
          </div>

          <div class="bio-offer-btns" style="margin-top:10px">
            <button type="submit" class="btn pri">Save & Activate Lock</button>
            <button type="button" class="btn" id="btnCancelSetup">Cancel</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(scrim);

    isSupportedPromise.then(supported => {
      const w = scrim.querySelector("#bioOptionWrap");
      if (w && supported) w.style.display = "block";
    });

    scrim.querySelector("#btnCancelSetup").addEventListener("click", () => scrim.remove());

    scrim.querySelector("#lockSetupForm").addEventListener("submit", async e => {
      e.preventDefault();
      const p1 = e.target.pin1.value.trim();
      const p2 = e.target.pin2.value.trim();
      const enableBio = e.target.querySelector("#chkEnableBio")?.checked;

      if (p1 !== p2) {
        alert("PINs do not match! Please enter the same 4 digits.");
        return;
      }
      if (!/^\d{4}$/.test(p1)) {
        alert("PIN must be exactly 4 numbers.");
        return;
      }

      await setPin(p1);

      if (enableBio) {
        try {
          await registerBiometrics(username);
        } catch (err) {
          alert("Biometric setup failed or was skipped: " + err.message + "\\n\\nPIN lock is still activated.");
        }
      }

      scrim.remove();
      if (window.toast) window.toast("Screen lock successfully activated!");
      else alert("Screen lock successfully activated!");
    });
  }

  function openLockSettingsModal() {
    const isConfigured = isLockEnabled();
    const hasBio = isBioEnabled();
    const currAuto = getAutoLockSetting();

    isBiometricAvailable().then(supported => {
      const scrim = document.createElement("div");
      scrim.className = "bio-offer-scrim";
      scrim.innerHTML = `
        <div class="bio-offer-card" style="max-width:420px">
          <div class="lock-brand" style="margin-bottom:12px">
            <div class="lock-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
            <h3 style="margin:8px 0 4px">Screen Lock & Security</h3>
            <p style="font-size:13px;color:var(--muted);margin:0">Protect financial books and customer data.</p>
          </div>

          <div style="text-align:left;display:flex;flex-direction:column;gap:14px;margin:16px 0">
            <div style="background:var(--surface-2);padding:12px;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:600;font-size:14px">Screen Lock Status</div>
                <div style="font-size:12.5px;color:var(--muted)">${isConfigured ? "Active (Protected by PIN" + (hasBio ? " & Biometrics)" : ")") : "Turned Off"}</div>
              </div>
              <span class="chip ${isConfigured ? "in" : "out"}">${isConfigured ? "ON" : "OFF"}</span>
            </div>

            ${isConfigured ? `
              <label class="f full">
                <span>Auto-Lock Timer</span>
                <select id="selAutoLock">
                  <option value="0" ${currAuto === "0" ? "selected" : ""}>Immediately when app is backgrounded / left</option>
                  <option value="60000" ${currAuto === "60000" ? "selected" : ""}>After 1 minute of inactivity</option>
                  <option value="300000" ${currAuto === "300000" ? "selected" : ""}>After 5 minutes of inactivity</option>
                  <option value="900000" ${currAuto === "900000" ? "selected" : ""}>After 15 minutes of inactivity</option>
                  <option value="never" ${currAuto === "never" ? "selected" : ""}>Never auto-lock (Manual only)</option>
                </select>
              </label>

              ${supported ? `
                <div style="background:var(--surface-2);padding:12px;border-radius:12px;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:600;font-size:14px">Fingerprint / Face Unlock</div>
                    <div style="font-size:12.5px;color:var(--muted)">${hasBio ? "Enabled on this device" : "Device supported (Not enabled)"}</div>
                  </div>
                  <button type="button" class="btn sm ${hasBio ? "danger-soft" : "pri"}" id="btnToggleBio">
                    ${hasBio ? "Disable" : "Enable"}
                  </button>
                </div>
              ` : `
                <div style="font-size:12px;color:var(--muted);background:var(--surface-2);padding:8px 12px;border-radius:8px">
                  ℹ️ This device / browser does not report a biometric authenticator. PIN lock is active.
                </div>
              `}

              <div style="display:flex;gap:8px;flex-direction:column">
                <button type="button" class="btn" id="btnChangePin">Change 4-Digit PIN</button>
                <button type="button" class="btn" id="btnTestLock">🔒 Lock Screen Now</button>
                <button type="button" class="btn danger-soft" id="btnTurnOffLock">Turn Off Screen Lock</button>
              </div>
            ` : `
              <div style="text-align:center;padding:10px 0">
                <button type="button" class="btn pri" id="btnStartSetup" style="width:100%">Set Up 4-Digit PIN & Biometrics</button>
              </div>
            `}
          </div>

          <div class="bio-offer-btns">
            <button type="button" class="btn" id="btnCloseSettings">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(scrim);

      scrim.querySelector("#btnCloseSettings")?.addEventListener("click", () => scrim.remove());

      scrim.querySelector("#selAutoLock")?.addEventListener("change", e => {
        localStorage.setItem(STORAGE_KEYS.AUTO_LOCK, e.target.value);
        if (window.toast) window.toast("Auto-lock timer updated.");
      });

      scrim.querySelector("#btnStartSetup")?.addEventListener("click", () => {
        scrim.remove();
        openSetupDialog();
      });

      scrim.querySelector("#btnChangePin")?.addEventListener("click", () => {
        scrim.remove();
        openSetupDialog();
      });

      scrim.querySelector("#btnTestLock")?.addEventListener("click", () => {
        scrim.remove();
        lock();
      });

      scrim.querySelector("#btnTurnOffLock")?.addEventListener("click", () => {
        if (confirm("Are you sure you want to turn off Screen Lock? Anyone with access to your device can view your books.")) {
          disableLock();
          scrim.remove();
          if (window.toast) window.toast("Screen lock disabled.");
        }
      });

      scrim.querySelector("#btnToggleBio")?.addEventListener("click", async () => {
        if (hasBio) {
          localStorage.removeItem(STORAGE_KEYS.BIO_ENABLED);
          localStorage.removeItem(STORAGE_KEYS.BIO_CRED_ID);
          scrim.remove();
          openLockSettingsModal();
          if (window.toast) window.toast("Biometrics disabled. PIN lock remains active.");
        } else {
          try {
            await registerBiometrics();
            scrim.remove();
            openLockSettingsModal();
            if (window.toast) window.toast("Biometrics successfully enabled!");
          } catch (e) {
            alert("Biometric registration cancelled or failed: " + e.message);
          }
        }
      });
    });
  }

  /* ---------- Initialization ---------- */
  function init() {
    setupAutoLockListeners();

    // Check if initial lock is required on page load
    if (isLockEnabled()) {
      lock();
    } else {
      // Suggest biometric setup if supported and not yet prompted
      setTimeout(() => {
        isBiometricAvailable().then(supported => {
          if (supported && !localStorage.getItem(STORAGE_KEYS.PROMPTED)) {
            promptBiometricOffer();
          }
        });
      }, 2000);
    }
  }

  window.KhataLock = {
    init,
    lock,
    unlock,
    isLockEnabled,
    isBioEnabled,
    isBiometricAvailable,
    openSetupDialog,
    openLockSettingsModal,
    promptBiometricOffer
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
