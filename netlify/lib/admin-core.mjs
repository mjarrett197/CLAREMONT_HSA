// Admin API for the Claremont Hindu Society website.
//
// Everything that decides who can do what lives here, kept apart from Netlify
// so it can be tested locally. netlify/functions/admin.mjs connects it to the
// real storage (Netlify Blobs) and the real sign-ups (Netlify Forms API).
//
// Who can sign in
//   - "owner": password from the ADMIN_OWNER_PASSWORD environment variable.
//     Manages the other admins and sees the activity log.
//   - admins: created by the owner on the admin page, each with their own
//     password (stored only as a scrypt hash). Removing or resetting an admin
//     signs them out everywhere.
//
// Storage keys (one Netlify Blobs store, "chs-admin")
//   config/session-secret   random key that signs session cookies
//   admins/<name>           { name, hash, version, createdAt, createdBy, lastLoginAt }
//   overrides/<id>          admin corrections to a sign-up (Netlify can't edit them)
//   roster/<id>             a sign-up approved for the public Members page
//   locks/<key>             recent failed sign-ins, for lockouts
//   audit/<time>-<rand>     who did what, newest kept for the owner

import crypto from "node:crypto";

const COOKIE = "chs_admin";
const SESSION_HOURS = 8;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const OWNER = "owner";
const NAME_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/;

export function createAdmin({ store, api, colleges, ownerPassword = "", now = () => Date.now() }) {
  const collegeNames = colleges.map((c) => c.name);
  const collegeIdByName = Object.fromEntries(colleges.map((c) => [c.name, c.id]));

  // ---------- small helpers ----------
  const json = (status, body, headers = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
        ...headers,
      },
    });
  const fail = (status, message, extra = {}) => json(status, { error: message, ...extra });
  const b64 = (buf) => Buffer.from(buf).toString("base64url");
  const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");
  const safeEqual = (a, b) => {
    const x = Buffer.from(String(a)), y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
  };
  const scrypt = (password, salt) =>
    new Promise((resolve, reject) =>
      crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key)))
    );
  async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    return `scrypt$${salt.toString("hex")}$${(await scrypt(password, salt)).toString("hex")}`;
  }
  async function checkPassword(password, stored) {
    const [, saltHex, hashHex] = String(stored || "scrypt$00$00").split("$");
    const key = await scrypt(password, Buffer.from(saltHex, "hex"));
    return safeEqual(key.toString("hex"), hashHex);
  }
  // Readable, strong generated password: 5 groups of 4 (about 100 bits).
  function generatePassword() {
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.randomBytes(20);
    let out = "";
    for (let i = 0; i < 20; i++) out += alphabet[bytes[i] % alphabet.length] + (i % 4 === 3 && i < 19 ? "-" : "");
    return out;
  }
  const ownerConfigured = () => typeof ownerPassword === "string" && ownerPassword.length > 0;
  const ownerVersion = () => sha("owner:" + ownerPassword).slice(0, 12);

  async function audit(who, action, target = "") {
    const at = new Date(now()).toISOString();
    await store.setJSON(`audit/${at}-${crypto.randomBytes(3).toString("hex")}`, { at, who, action, target });
  }

  // ---------- sessions ----------
  async function sessionSecret() {
    let secret = await store.get("config/session-secret", { type: "text" });
    if (!secret) {
      secret = crypto.randomBytes(32).toString("hex");
      await store.set("config/session-secret", secret);
    }
    return secret;
  }
  async function makeToken(user, version) {
    const payload = b64(JSON.stringify({ u: user, v: version, exp: now() + SESSION_HOURS * 3600e3 }));
    const sig = b64(crypto.createHmac("sha256", await sessionSecret()).update(payload).digest());
    return `${payload}.${sig}`;
  }
  const cookie = (value, maxAge) =>
    `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

  async function currentUser(request) {
    const raw = (request.headers.get("cookie") || "")
      .split(/;\s*/)
      .find((c) => c.startsWith(COOKIE + "="));
    if (!raw) return null;
    const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
    if (!payload || !sig) return null;
    const expected = b64(crypto.createHmac("sha256", await sessionSecret()).update(payload).digest());
    if (!safeEqual(sig, expected)) return null;
    let data;
    try { data = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
    if (!data || data.exp < now()) return null;
    if (data.u === OWNER) {
      return ownerConfigured() && data.v === ownerVersion() ? { name: OWNER, role: "owner" } : null;
    }
    const rec = await store.get(`admins/${data.u}`, { type: "json" });
    return rec && rec.version === data.v ? { name: rec.name, role: "admin" } : null;
  }

  // ---------- lockouts ----------
  async function lockState(key) {
    const rec = (await store.get(`locks/${key}`, { type: "json" })) || { fails: [] };
    rec.fails = rec.fails.filter((t) => t > now() - LOCK_MINUTES * 60e3);
    return rec;
  }
  async function recordFail(key) {
    const rec = await lockState(key);
    rec.fails.push(now());
    await store.setJSON(`locks/${key}`, rec);
  }
  const isLocked = (rec) => rec.fails.length >= MAX_FAILS;

  // ---------- sign-ups ----------
  async function signups() {
    const subs = await api.listSubmissions();
    const [overrides, roster] = await Promise.all([readAll("overrides/"), readAll("roster/")]);
    const ids = new Set(subs.map((s) => s.id));
    // A roster entry whose sign-up was deleted in Netlify directly: take it
    // off the public page too.
    for (const id of Object.keys(roster)) {
      if (!ids.has(id)) { await store.delete(`roster/${id}`); delete roster[id]; }
    }
    return subs
      .map((s) => merge(s, overrides[s.id], roster[s.id]))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  function merge(s, o = {}, r) {
    const d = s.data || {};
    const pick = (k, v) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : v);
    return {
      id: s.id,
      number: s.number,
      createdAt: s.created_at,
      name: pick("name", d.name || ""),
      email: pick("email", d.email || ""),
      phone: pick("phone", d.phone || ""),
      college: pick("college", d.college || ""),
      gradYear: pick("gradYear", String(d["graduation-year"] || "")),
      notes: pick("notes", ""),
      wantsListing: d["list-on-roster"] === "yes",
      onRoster: Boolean(r),
      edited: Boolean(o && o.updatedAt),
    };
  }
  async function readAll(prefix) {
    const { blobs } = await store.list({ prefix });
    const out = {};
    await Promise.all(
      blobs.map(async ({ key }) => { out[key.slice(prefix.length)] = await store.get(key, { type: "json" }); })
    );
    return out;
  }
  async function findSignup(id) {
    return (await signups()).find((s) => s.id === id) || null;
  }
  function rosterEntry(s, who) {
    return {
      name: s.name.trim(),
      college: collegeIdByName[s.college] || "",
      gradYear: /^\d{4}$/.test(s.gradYear) ? Number(s.gradYear) : null,
      approvedAt: new Date(now()).toISOString(),
      approvedBy: who,
    };
  }
  function validateEdit(body) {
    const out = {};
    const str = (v) => (v == null ? "" : String(v).trim());
    if ("name" in body) { out.name = str(body.name); if (!out.name || out.name.length > 100) return [null, "Name is required (up to 100 characters)."]; }
    if ("email" in body) { out.email = str(body.email); if (out.email.length > 200 || (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))) return [null, "That email doesn't look right."]; }
    if ("phone" in body) { out.phone = str(body.phone); if (out.phone.length > 40) return [null, "Phone is too long."]; }
    if ("college" in body) { out.college = str(body.college); if (out.college && !collegeNames.includes(out.college)) return [null, "Choose one of the seven colleges."]; }
    if ("gradYear" in body) { out.gradYear = str(body.gradYear); if (out.gradYear && !/^\d{4}$/.test(out.gradYear)) return [null, "Graduation year should be four digits."]; }
    if ("notes" in body) { out.notes = str(body.notes); if (out.notes.length > 1000) return [null, "Notes are limited to 1,000 characters."]; }
    return [out, null];
  }

  // ---------- request handling ----------
  async function readBody(request) {
    try { return (await request.json()) || {}; } catch { return {}; }
  }

  async function handle(request, { ip = "unknown" } = {}) {
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const method = request.method.toUpperCase();

    // Changes must come from the admin page itself.
    if (method !== "GET") {
      if (request.headers.get("x-chs-admin") !== "1") return fail(403, "Request refused.");
      const origin = request.headers.get("origin");
      if (origin && new URL(origin).host !== url.host) return fail(403, "Request refused.");
    }

    try {
      // ----- sign in / out -----
      if (parts[0] === "login" && method === "POST") {
        const { username = "", password = "" } = await readBody(request);
        const name = String(username).trim().toLowerCase();
        const ipKey = "ip-" + sha(ip).slice(0, 24);
        const userKey = "user-" + sha(name).slice(0, 24);
        const [ipLock, userLock] = await Promise.all([lockState(ipKey), lockState(userKey)]);
        if (isLocked(ipLock) || isLocked(userLock)) {
          return fail(429, `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`);
        }
        let ok = false, version = "";
        if (name === OWNER) {
          if (!ownerConfigured()) return fail(503, "The owner password hasn't been set up in Netlify yet.");
          ok = safeEqual(sha(password), sha(ownerPassword));
          version = ownerVersion();
        } else if (NAME_RE.test(name)) {
          const rec = await store.get(`admins/${name}`, { type: "json" });
          ok = await checkPassword(String(password), rec && rec.hash);
          ok = ok && Boolean(rec);
          if (ok) { version = rec.version; await store.setJSON(`admins/${name}`, { ...rec, lastLoginAt: new Date(now()).toISOString() }); }
        } else {
          await checkPassword(String(password), null); // same timing either way
        }
        if (!ok) {
          await Promise.all([recordFail(ipKey), recordFail(userKey)]);
          return fail(401, "That name and password don't match.");
        }
        await store.delete(`locks/${userKey}`);
        await audit(name, "signed in");
        return json(200, { name, role: name === OWNER ? "owner" : "admin" }, { "Set-Cookie": cookie(await makeToken(name, version), SESSION_HOURS * 3600) });
      }
      if (parts[0] === "logout" && method === "POST") {
        return json(200, { ok: true }, { "Set-Cookie": cookie("", 0) });
      }

      // ----- everything below needs a signed-in admin -----
      const user = await currentUser(request);
      if (!user) return fail(401, "Please sign in.");

      if (parts[0] === "me" && method === "GET") return json(200, user);

      if (parts[0] === "signups") {
        const id = parts[1];
        if (!id && method === "GET") {
          return json(200, { signups: await signups(), colleges: collegeNames });
        }
        const s = id && (await findSignup(id));
        if (!s) return fail(404, "That sign-up no longer exists.");

        if (!parts[2] && method === "PATCH") {
          const [changes, error] = validateEdit(await readBody(request));
          if (error) return fail(400, error);
          const prev = (await store.get(`overrides/${id}`, { type: "json" })) || {};
          await store.setJSON(`overrides/${id}`, { ...prev, ...changes, updatedAt: new Date(now()).toISOString(), updatedBy: user.name });
          const updated = { ...s, ...changes };
          if (s.onRoster) await store.setJSON(`roster/${id}`, rosterEntry(updated, user.name));
          await audit(user.name, "edited", `${updated.name} (#${s.number ?? id})`);
          return json(200, { signup: { ...updated, edited: true } });
        }
        if (parts[2] === "roster" && method === "POST") {
          const { listed } = await readBody(request);
          if (listed) {
            if (!s.wantsListing) return fail(400, "This member didn't ask to be listed on the Members page.");
            if (!collegeIdByName[s.college]) return fail(400, "Set this member's college before adding them to the roster.");
            await store.setJSON(`roster/${id}`, rosterEntry(s, user.name));
            await audit(user.name, "added to roster", s.name);
          } else {
            await store.delete(`roster/${id}`);
            await audit(user.name, "removed from roster", s.name);
          }
          return json(200, { signup: { ...s, onRoster: Boolean(listed) } });
        }
        if (!parts[2] && method === "DELETE") {
          await api.deleteSubmission(id);
          await Promise.all([store.delete(`overrides/${id}`), store.delete(`roster/${id}`)]);
          await audit(user.name, "deleted sign-up", `${s.name} (#${s.number ?? id})`);
          return json(200, { ok: true });
        }
      }

      if (parts[0] === "password" && method === "POST") {
        if (user.role === "owner") return fail(400, "The owner password is changed in Netlify (ADMIN_OWNER_PASSWORD).");
        const { current = "", next = "" } = await readBody(request);
        const rec = await store.get(`admins/${user.name}`, { type: "json" });
        if (!rec || !(await checkPassword(String(current), rec.hash))) return fail(400, "Your current password isn't right.");
        if (!String(next)) return fail(400, "Enter a new password.");
        const version = crypto.randomBytes(6).toString("hex");
        await store.setJSON(`admins/${user.name}`, { ...rec, hash: await hashPassword(String(next)), version });
        await audit(user.name, "changed own password");
        return json(200, { ok: true }, { "Set-Cookie": cookie(await makeToken(user.name, version), SESSION_HOURS * 3600) });
      }

      // ----- owner only -----
      if (parts[0] === "admins" || parts[0] === "activity") {
        if (user.role !== "owner") return fail(403, "Only the owner can do that.");
      }
      if (parts[0] === "activity" && method === "GET") {
        const { blobs } = await store.list({ prefix: "audit/" });
        const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 100);
        const items = await Promise.all(keys.map((k) => store.get(k, { type: "json" })));
        return json(200, { activity: items.filter(Boolean) });
      }
      if (parts[0] === "admins") {
        const name = parts[1] && parts[1].toLowerCase();
        if (!name && method === "GET") {
          const all = Object.values(await readAll("admins/"))
            .filter(Boolean)
            .map(({ name, createdAt, createdBy, lastLoginAt }) => ({ name, createdAt, createdBy, lastLoginAt: lastLoginAt || null }))
            .sort((a, b) => a.name.localeCompare(b.name));
          return json(200, { admins: all });
        }
        if (!name && method === "POST") {
          const body = await readBody(request);
          const newName = String(body.name || "").trim().toLowerCase();
          if (!NAME_RE.test(newName) || newName === OWNER) {
            return fail(400, "Use 2 to 32 lowercase letters, numbers, dots, dashes or underscores, such as priya.sharma.");
          }
          if (await store.get(`admins/${newName}`, { type: "json" })) return fail(409, "There's already an admin with that name.");
          const password = generatePassword();
          await store.setJSON(`admins/${newName}`, {
            name: newName, hash: await hashPassword(password), version: crypto.randomBytes(6).toString("hex"),
            createdAt: new Date(now()).toISOString(), createdBy: user.name,
          });
          await audit(user.name, "added admin", newName);
          return json(201, { name: newName, password });
        }
        const rec = name && (await store.get(`admins/${name}`, { type: "json" }));
        if (!rec) return fail(404, "No admin with that name.");
        if (parts[2] === "reset" && method === "POST") {
          const password = generatePassword();
          await store.setJSON(`admins/${name}`, { ...rec, hash: await hashPassword(password), version: crypto.randomBytes(6).toString("hex") });
          await audit(user.name, "reset password for", name);
          return json(200, { name, password });
        }
        if (!parts[2] && method === "DELETE") {
          await store.delete(`admins/${name}`);
          await audit(user.name, "removed admin", name);
          return json(200, { ok: true });
        }
      }

      return fail(404, "Not found.");
    } catch (err) {
      console.error("Admin API error:", err);
      const message = err && err.userMessage ? err.userMessage : "Something went wrong. Try again in a minute.";
      return fail(err && err.status === 503 ? 503 : 500, message);
    }
  }

  return { handle, _test: { hashPassword, checkPassword, generatePassword } };
}

// Public list for the Members page: only approved members, and only their
// name, college and graduation year.
export async function publicRoster(store) {
  const { blobs } = await store.list({ prefix: "roster/" });
  const items = await Promise.all(blobs.map(({ key }) => store.get(key, { type: "json" })));
  return items
    .filter((r) => r && r.name && r.college)
    .map(({ name, college, gradYear }) => ({ name, college, gradYear: gradYear || null }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
