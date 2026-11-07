// CHS admin page. Talks to /api/admin/* (netlify/functions/admin.mjs).
// The server decides what each person may see or change; this file only
// draws it. All text from sign-ups is inserted as text, never as HTML.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const state = { me: null, signups: [], colleges: [], editing: null };

  // ---------- server calls ----------
  async function api(method, path, body) {
    const res = await fetch("/api/admin" + path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CHS-Admin": "1" },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (e) { /* empty */ }
    if (res.status === 401 && path !== "/login") { showLogin(); throw new Error(data.error || "Please sign in."); }
    if (!res.ok) throw new Error(data.error || "Something went wrong (" + res.status + ").");
    return data;
  }

  // ---------- helpers ----------
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) node.append(c instanceof Node ? c : document.createTextNode(c == null ? "" : String(c)));
    return node;
  }
  const show = (node, on) => { node.hidden = !on; };
  function showError(node, message) { node.textContent = message || ""; show(node, Boolean(message)); }
  function toast(message) {
    const t = $("admin-toast");
    t.textContent = message; show(t, true);
    clearTimeout(toast._t); toast._t = setTimeout(() => show(t, false), 3500);
  }
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };
  function confirmBox(title, text, okLabel) {
    $("confirm-title").textContent = title;
    $("confirm-text").textContent = text;
    $("confirm-ok").textContent = okLabel;
    const dlg = $("dlg-confirm");
    return new Promise((resolve) => {
      dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
      dlg.returnValue = "";
      dlg.showModal();
    });
  }
  document.querySelectorAll("dialog [data-close]").forEach((b) =>
    b.addEventListener("click", () => b.closest("dialog").close("cancel")));

  // ---------- sign in / out ----------
  function showLogin() {
    state.me = null;
    show($("admin-loading"), false); show($("admin-app"), false); show($("admin-login"), true);
    setTimeout(() => $("login-name").focus(), 0);
  }
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; showError($("login-error"), "");
    try {
      const me = await api("POST", "/login", { username: $("login-name").value, password: $("login-password").value });
      $("login-password").value = "";
      await start(me);
    } catch (err) {
      showError($("login-error"), err.message);
    } finally { btn.disabled = false; }
  });
  $("btn-logout").addEventListener("click", async () => {
    try { await api("POST", "/logout"); } catch (e) { /* ignore */ }
    state.signups = []; renderSignups(); showLogin();
  });

  async function start(me) {
    state.me = me;
    $("admin-who").textContent = me.role === "owner" ? "Signed in as the site owner" : "Signed in as " + me.name;
    show($("admin-tabs"), me.role === "owner");
    show($("btn-password"), me.role !== "owner");
    show($("admin-loading"), false); show($("admin-login"), false); show($("admin-app"), true);
    selectTab("signups");
    await loadSignups();
  }

  // ---------- tabs ----------
  function selectTab(name) {
    document.querySelectorAll("#admin-tabs [role=tab]").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    ["signups", "admins", "activity"].forEach((t) => show($("tab-" + t), t === name));
    if (name === "admins") loadAdmins();
    if (name === "activity") loadActivity();
  }
  $("admin-tabs").addEventListener("click", (e) => { const t = e.target.closest("[data-tab]"); if (t) selectTab(t.dataset.tab); });

  // ---------- sign-ups ----------
  async function loadSignups() {
    showError($("signups-error"), "");
    $("btn-refresh").disabled = true;
    try {
      const data = await api("GET", "/signups");
      state.signups = data.signups; state.colleges = data.colleges;
      fillCollegeSelects();
      renderSignups();
    } catch (err) {
      showError($("signups-error"), err.message);
    } finally { $("btn-refresh").disabled = false; }
  }
  function fillCollegeSelects() {
    for (const id of ["f-college", "e-college"]) {
      const sel = $(id); const keep = sel.value;
      while (sel.options.length > 1) sel.remove(1);
      state.colleges.forEach((c) => sel.add(new Option(c, c)));
      sel.value = keep;
    }
  }
  function filtered() {
    const q = $("f-search").value.trim().toLowerCase();
    const college = $("f-college").value;
    const wants = $("f-wants").checked;
    return state.signups.filter((s) =>
      (!q || [s.name, s.email, s.phone].some((v) => String(v || "").toLowerCase().includes(q))) &&
      (!college || s.college === college) &&
      (!wants || s.wantsListing));
  }
  function rosterCell(s) {
    if (!s.wantsListing) return el("span", { class: "admin-muted" }, "Didn't ask");
    if (s.onRoster) {
      return el("span", { class: "admin-roster" },
        el("span", { class: "admin-badge admin-badge-on" }, "Listed"),
        el("button", { type: "button", class: "admin-link", onclick: () => setRoster(s, false) }, "Remove"));
    }
    return el("button", { type: "button", class: "admin-btn admin-btn-small", onclick: () => setRoster(s, true) }, "Add to page");
  }
  function renderSignups() {
    const rows = filtered();
    const tbody = $("signups-table").querySelector("tbody");
    tbody.replaceChildren(...rows.map((s) =>
      el("tr", {},
        el("td", { "data-label": "Signed up" }, fmtDate(s.createdAt)),
        el("td", { "data-label": "Name" }, el("strong", {}, s.name || "(no name)"),
          s.edited ? el("span", { class: "admin-badge", title: "Edited by an admin" }, "edited") : "",
          s.notes ? el("div", { class: "admin-note" }, s.notes) : ""),
        el("td", { "data-label": "Email" }, s.email ? el("a", { href: "mailto:" + s.email }, s.email) : ""),
        el("td", { "data-label": "Phone" }, s.phone ? el("a", { href: "tel:" + s.phone.replace(/[^\d+]/g, "") }, s.phone) : ""),
        el("td", { "data-label": "College" }, s.college),
        el("td", { "data-label": "Year" }, s.gradYear),
        el("td", { "data-label": "Members page" }, rosterCell(s)),
        el("td", { class: "admin-actions" },
          el("button", { type: "button", class: "admin-link", onclick: () => openEdit(s) }, "Edit"),
          el("button", { type: "button", class: "admin-link admin-link-danger", onclick: () => removeSignup(s) }, "Delete")))));
    show($("signups-table"), rows.length > 0);
    show($("signups-empty"), rows.length === 0);
    $("signups-empty").textContent = state.signups.length ? "No sign-ups match these filters." : "No sign-ups yet.";
    $("f-count").textContent = rows.length === state.signups.length
      ? state.signups.length + " sign-up" + (state.signups.length === 1 ? "" : "s")
      : rows.length + " of " + state.signups.length;
  }
  ["f-search", "f-college", "f-wants"].forEach((id) => $(id).addEventListener("input", renderSignups));
  $("btn-refresh").addEventListener("click", loadSignups);

  function replaceSignup(updated) {
    state.signups = state.signups.map((s) => (s.id === updated.id ? updated : s));
    renderSignups();
  }
  async function setRoster(s, listed) {
    try {
      const data = await api("POST", "/signups/" + encodeURIComponent(s.id) + "/roster", { listed });
      replaceSignup(data.signup);
      toast(listed ? s.name + " is now on the Members page (allow a minute to appear)." : s.name + " was taken off the Members page.");
    } catch (err) { toast(err.message); }
  }
  async function removeSignup(s) {
    const ok = await confirmBox("Delete this sign-up?",
      s.name + "'s sign-up will be permanently deleted from Netlify" + (s.onRoster ? " and removed from the Members page" : "") + ". This can't be undone.",
      "Delete permanently");
    if (!ok) return;
    try {
      await api("DELETE", "/signups/" + encodeURIComponent(s.id));
      state.signups = state.signups.filter((x) => x.id !== s.id);
      renderSignups(); toast("Deleted " + s.name + "'s sign-up.");
    } catch (err) { toast(err.message); }
  }

  // edit
  function openEdit(s) {
    state.editing = s;
    $("e-name").value = s.name || ""; $("e-email").value = s.email || ""; $("e-phone").value = s.phone || "";
    $("e-college").value = s.college || ""; $("e-year").value = s.gradYear || ""; $("e-notes").value = s.notes || "";
    showError($("edit-error"), "");
    $("dlg-edit").showModal();
  }
  $("edit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const s = state.editing; if (!s) return;
    try {
      const data = await api("PATCH", "/signups/" + encodeURIComponent(s.id), {
        name: $("e-name").value, email: $("e-email").value, phone: $("e-phone").value,
        college: $("e-college").value, gradYear: $("e-year").value, notes: $("e-notes").value,
      });
      replaceSignup(data.signup); $("dlg-edit").close(); toast("Saved.");
    } catch (err) { showError($("edit-error"), err.message); }
  });

  // export
  $("btn-export").addEventListener("click", () => {
    const rows = filtered();
    const cols = [["Signed up", "createdAt"], ["Name", "name"], ["Email", "email"], ["Phone", "phone"], ["College", "college"],
      ["Graduation year", "gradYear"], ["Asked to be listed", "wantsListing"], ["On Members page", "onRoster"], ["Board notes", "notes"]];
    const cell = (v) => {
      let s = typeof v === "boolean" ? (v ? "Yes" : "No") : String(v == null ? "" : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // never a spreadsheet formula
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = [cols.map((c) => cell(c[0])).join(",")].concat(rows.map((r) => cols.map((c) => cell(r[c[1]])).join(","))).join("\r\n");
    const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })), download: "chs-signups-" + new Date().toISOString().slice(0, 10) + ".csv" });
    document.body.append(a); a.click(); a.remove();
    toast("Downloaded " + rows.length + " sign-up" + (rows.length === 1 ? "" : "s") + ". Keep the file private.");
  });

  // ---------- own password ----------
  $("btn-password").addEventListener("click", () => {
    $("p-current").value = ""; $("p-next").value = ""; showError($("password-error"), "");
    $("dlg-password").showModal();
  });
  $("password-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("POST", "/password", { current: $("p-current").value, next: $("p-next").value });
      $("dlg-password").close(); toast("Password changed.");
    } catch (err) { showError($("password-error"), err.message); }
  });

  // ---------- admins (owner) ----------
  async function loadAdmins() {
    showError($("admins-error"), "");
    try {
      const { admins } = await api("GET", "/admins");
      $("admins-table").querySelector("tbody").replaceChildren(...admins.map((a) =>
        el("tr", {},
          el("td", { "data-label": "Name" }, el("strong", {}, a.name)),
          el("td", { "data-label": "Added" }, fmtDate(a.createdAt)),
          el("td", { "data-label": "Last sign-in" }, a.lastLoginAt ? fmtDate(a.lastLoginAt) : "Never"),
          el("td", { class: "admin-actions" },
            el("button", { type: "button", class: "admin-link", onclick: () => resetAdmin(a.name) }, "New password"),
            el("button", { type: "button", class: "admin-link admin-link-danger", onclick: () => removeAdmin(a.name) }, "Remove")))));
      show($("admins-table"), admins.length > 0);
      show($("admins-empty"), admins.length === 0);
    } catch (err) { showError($("admins-error"), err.message); }
  }
  function showNewPassword(name, password) {
    $("new-password-who").textContent = name;
    $("new-password-value").textContent = password;
    show($("new-password"), true);
  }
  $("btn-copy-password").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("new-password-value").textContent); toast("Copied."); }
    catch (e) { toast("Select the password and copy it."); }
  });
  $("add-admin-form").addEventListener("submit", async (e) => {
    e.preventDefault(); showError($("admins-error"), "");
    try {
      const { name, password } = await api("POST", "/admins", { name: $("new-admin-name").value });
      $("new-admin-name").value = ""; showNewPassword(name, password); loadAdmins();
    } catch (err) { showError($("admins-error"), err.message); }
  });
  async function resetAdmin(name) {
    if (!(await confirmBox("Give " + name + " a new password?", "Their current password stops working and they're signed out everywhere.", "Make new password"))) return;
    try { const r = await api("POST", "/admins/" + encodeURIComponent(name) + "/reset"); showNewPassword(r.name, r.password); loadAdmins(); }
    catch (err) { showError($("admins-error"), err.message); }
  }
  async function removeAdmin(name) {
    if (!(await confirmBox("Remove " + name + "?", "They'll be signed out and won't be able to sign in again.", "Remove admin"))) return;
    try { await api("DELETE", "/admins/" + encodeURIComponent(name)); show($("new-password"), false); loadAdmins(); toast("Removed " + name + "."); }
    catch (err) { showError($("admins-error"), err.message); }
  }

  // ---------- activity (owner) ----------
  async function loadActivity() {
    try {
      const { activity } = await api("GET", "/activity");
      $("activity-list").replaceChildren(...(activity.length ? activity : [null]).map((a) => a
        ? el("li", {}, el("time", {}, fmtDate(a.at)), " ", el("strong", {}, a.who), " " + a.action + (a.target ? " " + a.target : ""))
        : el("li", { class: "admin-muted" }, "Nothing yet.")));
    } catch (err) { toast(err.message); }
  }

  // ---------- go ----------
  api("GET", "/me").then(start).catch(() => {});
})();
