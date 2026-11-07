# Editing the CHS site

You don't need to install anything to make a content change. Edit a file on
GitHub (or ask Claude to), commit to `main`, and Netlify publishes it in
about a minute.

## What still needs filling in

Each of these is hidden on the site until it has content, so nothing shows
half-finished:

- `src/_data/site.js`: `intro` (home page, in the students' own words),
  `contact.email`, `social` links.
- `src/_data/about.js`: objective, board note, membership requirements.
  The About page and its menu link appear once any of these, or a board
  member, exists.
- `src/_data/board.js`: student leadership.
- Wellness Center: switched off with `wellness.enabled: false` in `site.js`
  until the affiliate agreement is signed. The checklist for switching it
  back on is in the comment above that setting.

## Add an event

1. Open `src/_data/events.js` and click the pencil (Edit).
2. Copy an existing `{ ... },` block and paste it at the top.
3. Change the fields:
   - `date` as `YYYY-MM-DD`, e.g. `"2026-11-08"`
   - `start` / `end` in 24-hour time, e.g. `"18:00"` = 6 PM. Leave `start`
     as `""` for an all-day event.
   - `id` is a short unique name with dashes, like `"diwali-2026"`.
4. **Commit changes** to `main`.

It appears on the Events calendar under its month, with an "Add to Google
Calendar" link, and on the home page if it's one of the next three. When the
date passes it moves to "Past events" on the next rebuild.

## Admin page: sign-ups and the roster

Board admins manage sign-ups at **/admin/** (not linked from the site).
Each admin has their own name and password; the owner signs in as `owner`.

- **Sign-ups tab:** every membership sign-up, newest first. Search, filter
  by college, edit details (corrections are stored alongside; Netlify keeps
  the original), add board notes, delete, and export a CSV.
- **Members page column:** "Add to page" puts someone on the public Members
  page within about a minute, with no site update. Only shown for people who
  ticked the box asking to be listed.
- **Admins tab (owner only):** add an admin (a password is generated and
  shown once), give someone a new password, or remove them. Both sign that
  person out everywhere.
- **Activity tab (owner only):** the last 100 actions, with who did them.

Behind the scenes: `netlify/functions/admin.mjs` and `roster.mjs`, with the
rules in `netlify/lib/admin-core.mjs`. Edits, roster approvals and admin
accounts are stored in Netlify Blobs (store `chs-admin`). Two environment
variables, scope Functions, marked secret:

- `ADMIN_OWNER_PASSWORD`: the owner's password (any length; longer is safer). Changing it
  signs the owner out everywhere.
- `NETLIFY_API_TOKEN`: a Netlify personal access token, used to read and
  delete sign-ups. It has full access to the Netlify account, so keep it
  only there, set an expiry, and make a new one if it might have leaked.

## Adding someone to the roster by hand

Normally use the admin page. To list someone permanently in the code
instead (for example, a founding member who didn't use the form):

If the person ticked "Also list my name ... on the public Members page" (it
starts unticked), add a line to
`src/_data/members.js`:

```js
{ name: "Priya Sharma", college: "pomona", gradYear: 2028 },
```

College ids: `cgu` · `cmc` · `hmc` · `kgi` · `pitzer` · `pomona` · `scripps`

**Never put email addresses or phone numbers in members.js.** It is public.

## Update student leadership

Edit `src/_data/board.js`. For a photo, upload a square image to
`images/board/` (e.g. `images/board/priya.jpg`) and set
`photo: "/images/board/priya.jpg"`.

## QR codes

The codes are made from the links in `src/_data/site.js` on every build:
one to `<url>/join/`, and one to the Wellness Center link while that page
is switched on. If a
link changes, the code changes too, so reprint any flyers after changing
one. Printable versions and PNG downloads are at `/qr/`.

## Add a new page

Copy `src/pages/contact.md`, rename it, and change `title`, `subtitle` and
`permalink` (e.g. `/gallery/`). To show it in the menu, add a link in
`src/_includes/base.njk`.

## Editing with Claude

Give Claude access to this repo and ask in plain words, e.g. "Add a Holi
event on March 14 from 2 to 5pm on Pomona's Marston Quad", or "Add these
three new members to the roster." Claude edits the data file and pushes to
`main`; Netlify does the rest.
