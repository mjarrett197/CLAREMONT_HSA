// /api/roster : the public Members page list. Only members an admin approved
// (and who asked to be listed), and only name, college and graduation year.

import { getStore } from "@netlify/blobs";
import { publicRoster } from "../lib/admin-core.mjs";

export default async () => {
  try {
    const roster = await publicRoster(getStore({ name: "chs-admin", consistency: "strong" }));
    return new Response(JSON.stringify(roster), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "Netlify-CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("Roster error:", err);
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
};

export const config = { path: "/api/roster" };
