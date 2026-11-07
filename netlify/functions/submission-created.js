// Runs on Netlify every time a form submission is verified (not spam).
// Netlify calls a function with this exact file name automatically; nothing
// else needs to be configured to trigger it.
//
// It forwards membership sign-ups to the Google Sheet's Apps Script web app,
// whose full link (ending in ?token=...) is stored privately in Netlify:
//   Project configuration -> Environment variables -> SHEETS_WEBHOOK_URL
//   (scope must include Functions). Change it there; never put it in code.
//
// If the variable is missing or the sheet is unreachable, the sign-up is
// still safe in Netlify (Forms -> membership); this only logs the problem.

exports.handler = async (event) => {
  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}").payload || {};
  } catch (err) {
    console.error("Could not read the submission:", err);
    return { statusCode: 200, body: "unreadable" };
  }

  if (payload.form_name !== "membership") {
    return { statusCode: 200, body: "not a membership sign-up" };
  }

  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) {
    console.warn("SHEETS_WEBHOOK_URL is not set, so the sign-up was not copied to the sheet.");
    return { statusCode: 200, body: "sheet not configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_name: payload.form_name,
        created_at: payload.created_at,
        data: payload.data || {}
      }),
      redirect: "follow"
    });
    const text = (await res.text()).slice(0, 200);
    if (!res.ok || text.trim() !== "ok") {
      console.error(`Sheet did not confirm the row (HTTP ${res.status}): ${text}`);
    }
  } catch (err) {
    console.error("Could not reach the sheet:", err);
  }
  // Always succeed, so a sheet problem never affects the sign-up itself.
  return { statusCode: 200, body: "done" };
};
