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

## Sign-ups in Google Sheets

Every verified sign-up is also copied to a board-only Google Sheet by
`netlify/functions/submission-created.js`. The sheet's Apps Script link
(ending in `?token=...`) is stored in Netlify under Project configuration →
Environment variables → `SHEETS_WEBHOOK_URL`, never in the code. If the sheet
ever stops updating, sign-ups are still safe in Netlify; check the function's
log under Logs → Functions, and the sheet's "Webhook log" tab.

## New member sign-ups → the roster

Sign-ups from the Become a Member form (and its QR code) appear in Netlify
under **Forms → membership**, with name, email, phone, college and
graduation year.

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
