# Developing the CHS site

Only needed if you want to preview changes on your own computer before
pushing. Requires Node.js 18 or newer.

## First-time setup

```bash
cd CLAREMONT_HSA
npm install
```

## Preview locally

```bash
npm run serve
```

Opens at http://localhost:8080 and reloads as you save.

## Deploying

Every push to `main` triggers a Netlify build, so push meaningful batches
rather than every small save.

```bash
git add -A
git commit -m "meaningful description"
git push origin main
```

## Netlify settings (already in netlify.toml)

- Build command: `npx @11ty/eleventy`
- Publish directory: `_site`

## Keeping "Past events" current

The site sorts events when it builds. If weeks go by with no edits, a past
event can still show as upcoming. Either push any small change, or in
Netlify create a **Build hook** (Site configuration → Build & deploy →
Build hooks) and trigger it on a schedule.
