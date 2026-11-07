const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const TZ = "America/Los_Angeles";

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("_redirects");

  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));

  // ---- Dates ---------------------------------------------------------------
  // Event dates are calendar days. Reading them at noon keeps an evening event
  // from slipping to the next day in any time zone.
  const day = (d) => new Date(d + "T12:00:00");
  const fmt = (d, opts) => day(d).toLocaleDateString("en-US", { timeZone: TZ, ...opts });

  eleventyConfig.addFilter("longDate", (d) => fmt(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  eleventyConfig.addFilter("eventMonth", (d) => fmt(d, { month: "short" }).toUpperCase());
  eleventyConfig.addFilter("eventDay", (d) => fmt(d, { day: "numeric" }));
  eleventyConfig.addFilter("eventWeekday", (d) => fmt(d, { weekday: "short" }));

  // "18:00" -> "6:00 PM"
  const clock = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  eleventyConfig.addFilter("eventTime", (e) =>
    !e.start ? "All day" : e.end ? `${clock(e.start)} – ${clock(e.end)}` : clock(e.start)
  );

  // Events split at build time. A past event moves to "Past events" the next
  // time the site is rebuilt (any push to main rebuilds it).
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  eleventyConfig.addFilter("upcoming", (events) =>
    events.filter((e) => e.date >= today()).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
  );
  eleventyConfig.addFilter("past", (events) =>
    events.filter((e) => e.date < today()).sort((a, b) => b.date.localeCompare(a.date))
  );

  // [{date:"2026-11-08"},...] -> [{label:"November 2026", events:[...]}, ...]
  eleventyConfig.addFilter("byMonth", (events) => {
    const groups = [];
    for (const e of events) {
      const label = fmt(e.date, { month: "long", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.events.push(e);
      else groups.push({ label, events: [e] });
    }
    return groups;
  });

  // "Add to Google Calendar" link. Times are sent as Pacific time.
  eleventyConfig.addFilter("gcalLink", (e) => {
    const d = e.date.replace(/-/g, "");
    let dates;
    if (!e.start) {
      const next = new Date(day(e.date).getTime() + 86400000).toISOString().slice(0, 10).replace(/-/g, "");
      dates = `${d}/${next}`;
    } else {
      const s = e.start.replace(":", "") + "00";
      const endT = e.end || `${String(Math.min(Number(e.start.split(":")[0]) + 1, 23)).padStart(2, "0")}:${e.start.split(":")[1]}`;
      dates = `${d}T${s}/${d}T${endT.replace(":", "")}00`;
    }
    const q = new URLSearchParams({
      action: "TEMPLATE",
      text: e.title,
      dates,
      ctz: TZ,
      details: e.description || "",
      location: e.location || ""
    });
    return `https://calendar.google.com/calendar/render?${q.toString()}`;
  });

  // ---- Lookups -------------------------------------------------------------
  eleventyConfig.addFilter("membersOf", (members, collegeId) =>
    members.filter((m) => m.college === collegeId).sort((a, b) => a.name.localeCompare(b.name))
  );
  eleventyConfig.addFilter("collegeName", (id, colleges) => {
    const c = colleges.find((c) => c.id === id);
    return c ? c.short : "";
  });
  eleventyConfig.addFilter("gradYears", () => {
    const y = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => y + i);
  });

  // ---- QR codes ------------------------------------------------------------
  // Generated from the links in src/_data/site.js on every build, so changing
  // a link there changes the code. Never edit a QR image by hand.
  const qrColors = { dark: "#4E1119", light: "#FFFFFF" };
  eleventyConfig.addNunjucksAsyncShortcode("qr", async (url, label) => {
    if (!url) return "";
    const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: qrColors });
    return svg.replace("<svg ", `<svg role="img" aria-label="QR code: ${label}" class="qr-svg" `);
  });

  // Downloadable PNGs for flyers and slides: /qr/become-a-member.png and
  // /qr/wellness-center.png
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    delete require.cache[require.resolve("./src/_data/site.js")];
    const site = require("./src/_data/site.js");
    const out = path.join(dir.output, "qr");
    fs.mkdirSync(out, { recursive: true });
    const opts = { width: 1200, margin: 2, errorCorrectionLevel: "M", color: qrColors };
    await QRCode.toFile(path.join(out, "become-a-member.png"), `${site.url}/join/`, opts);
    if (site.wellness.enabled) {
      await QRCode.toFile(path.join(out, "wellness-center.png"), site.wellness.url, opts);
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
