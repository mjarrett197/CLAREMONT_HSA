// Reads and deletes "membership" sign-ups through the Netlify API.
// Needs a Netlify personal access token in the NETLIFY_API_TOKEN environment
// variable (Netlify: User settings -> Applications -> Personal access tokens).

const BASE = "https://api.netlify.com/api/v1";
const FORM = "membership";

export function netlifyApi({ token, siteId, fetchImpl = fetch }) {
  let formId = null;

  async function call(path, init = {}) {
    if (!token) throw userError(503, "The Netlify access key (NETLIFY_API_TOKEN) hasn't been set up yet.");
    if (!siteId) throw userError(503, "Netlify didn't tell the admin page which site it belongs to.");
    const res = await fetchImpl(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "chs-website-admin", ...(init.headers || {}) },
    });
    if (res.status === 401 || res.status === 403) {
      throw userError(503, "Netlify refused the access key (NETLIFY_API_TOKEN). It may have expired; make a new one.");
    }
    return res;
  }

  async function membershipFormId() {
    if (formId) return formId;
    const res = await call(`/sites/${siteId}/forms`);
    if (!res.ok) throw new Error(`Listing forms failed: HTTP ${res.status}`);
    const form = (await res.json()).find((f) => f.name === FORM);
    if (!form) throw userError(503, "Netlify hasn't found the membership form yet. Check that form detection is on.");
    return (formId = form.id);
  }

  return {
    async listSubmissions() {
      const id = await membershipFormId();
      const all = [];
      for (let page = 1; page <= 50; page++) {
        const res = await call(`/forms/${id}/submissions?per_page=100&page=${page}`);
        if (!res.ok) throw new Error(`Listing sign-ups failed: HTTP ${res.status}`);
        const batch = await res.json();
        all.push(...batch);
        if (batch.length < 100) break;
      }
      return all;
    },
    async deleteSubmission(id) {
      const res = await call(`/submissions/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`Deleting sign-up failed: HTTP ${res.status}`);
    },
  };
}

function userError(status, userMessage) {
  const err = new Error(userMessage);
  err.status = status;
  err.userMessage = userMessage;
  return err;
}
