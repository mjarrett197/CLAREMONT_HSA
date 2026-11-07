# Claremont Hindu Society

Website for the Claremont Hindu Society (CHS) at the Claremont Colleges.

- **Live at:** https://claremonthsa.netlify.app
- **Stack:** Eleventy · Netlify (same as globalspiritualcare-website)
- **Membership form:** Netlify Forms; board admins manage sign-ups and the public roster at `/admin/`
- **QR codes:** generated on every build from the links in `site.js`; print them from `/qr/`
- **Deploys:** every push to `main` on GitHub rebuilds and publishes the site automatically

## Repo layout

```
src/              Eleventy source
  _data/          Content as data  ← most edits happen here
    site.js         name, domain, email, Wellness Center links (QR codes come from these)
    events.js       events calendar
    about.js        About page text (objective, requirements)
    board.js        student leadership (shown on About)
    members.js      membership roster (shown on Members, by college)
    colleges.js     the seven Claremont Colleges
  _includes/      Layouts (base.njk = header/footer, page.njk = simple text page)
  pages/          One file per page: about, members, join (membership form),
                  events, wellness, contact, qr (printable QR codes, not in menu)
  index.njk       Home page
css/style.css     All styling; brand colours are the variables at the top
images/           Images, copied to the site as-is (board photos in images/board/)
docs/             How to edit and develop
netlify.toml      Netlify build settings
_redirects        Old URL → new URL redirects
```

## Common edits

| To change…                    | Edit…                       |
|-------------------------------|-----------------------------|
| An event                      | `src/_data/events.js`       |
| Student leadership            | `src/_data/board.js`        |
| Membership roster             | `src/_data/members.js`      |
| Email, domain, Wellness links | `src/_data/site.js`         |
| About text / requirements     | `src/_data/about.js`        |
| Share image (link previews)   | `images/og/share.jpg`       |
| Home page text                | `src/index.njk`             |
| Colours / fonts               | `css/style.css` (top)       |
| Header / footer links         | `src/_includes/base.njk`    |

See `docs/EDITING.md` for step-by-step instructions, and `docs/DEVELOPING.md` for running it locally.
