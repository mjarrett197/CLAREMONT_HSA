// /api/admin/* : the admin page's server side. All rules are in
// netlify/lib/admin-core.mjs; this file only connects them to Netlify.
//
// Environment variables (Netlify: Project configuration -> Environment
// variables, scope must include Functions, mark as secret):
//   ADMIN_OWNER_PASSWORD  the owner's password (any length; longer is safer)
//   NETLIFY_API_TOKEN     personal access token, used to read/delete sign-ups

import { getStore } from "@netlify/blobs";
import { createAdmin } from "../lib/admin-core.mjs";
import { netlifyApi } from "../lib/netlify-api.mjs";
import colleges from "../../src/_data/colleges.js";

export default async (request, context) => {
  const admin = createAdmin({
    store: getStore({ name: "chs-admin", consistency: "strong" }),
    api: netlifyApi({
      token: process.env.NETLIFY_API_TOKEN,
      siteId: (context.site && context.site.id) || process.env.SITE_ID,
    }),
    colleges,
    ownerPassword: process.env.ADMIN_OWNER_PASSWORD || "",
  });
  return admin.handle(request, { ip: context.ip });
};

export const config = { path: ["/api/admin", "/api/admin/*"] };
