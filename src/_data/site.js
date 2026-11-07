// Sitewide settings. Name, links, contact and colours live here so a change
// is made once rather than on every page.
//
// The QR codes are generated from `url` (and `wellness.url` while the
// Wellness Center is on), so they update by themselves on the next build.
// An empty "" hides whatever that setting controls.

module.exports = {
  name: "Claremont Hindu Society",
  short: "CHS",
  tagline: "A home for Hindu students and friends across the Claremont Colleges",

  // Picture shown when a link to the site is shared (WhatsApp, iMessage,
  // Instagram, Facebook, LinkedIn, X). 1200 x 630 JPG, under 300 KB.
  shareImage: {
    path: "/images/og/share.jpg",
    alt: "Claremont Hindu Society: community, culture and dharma across the Claremont Colleges"
  },

  // One or two sentences under the home page headline, in the students' own
  // words. "" hides it.
  intro: "",
  // The live address, no trailing slash. Used by the Become a Member QR code,
  // search engines and share links. Change it the day a domain goes live.
  url: "https://claremonthsa.netlify.app",

  // While true: search engines are asked not to list the site, and a thin
  // banner tells visitors it's a preview. Set to false at launch.
  testMode: false,
  // Leave "" until there is a club address; the footer, Contact page and
  // form note only show it once it's set.
  contact: {
    email: ""
  },
  // Leave a link as "" to hide it.
  social: {
    instagram: "",
    linktree: ""
  },

  // HSCI Student Wellness Center. CHS links to it; HSCI runs it.
  //
  // OFF until the affiliate agreement with Claremont is signed. While
  // `enabled` is false there is no /wellness/ page (it redirects home), no
  // menu or footer link, no home-page card and no Wellness QR code.
  //
  // Before switching it back on:
  //   1. Affiliate agreement with Claremont signed.
  //   2. HSCI confirms it can stand behind "in confidence" and "counselor"
  //      as written on the page (src/pages/wellness.njk); reword if not.
  //   3. Real links below (url is required for the QR code).
  //   4. Campus counseling details below still current.
  wellness: {
    enabled: false,
    name: "HSCI Student Wellness Center",
    url: "",
    // Each of these can point to its own page on the HSCI site. Leave "" to
    // send that card to the main Wellness Center link above.
    yogaUrl: "",
    videosUrl: "",
    conversationUrl: "",
    // Optional sentence on how CHS and HSCI are connected. "" hides it.
    intro: "",
    videoTopics: [
      "Bhagavad Gita teachings",
      "Hindu values",
      "Exam anxiety",
      "Stress and burnout",
      "Relationships"
    ]
  },

  brand: {
    maroon: "#7A1F2B",
    maroonDeep: "#4E1119",
    saffron: "#E8891C",
    saffronDeep: "#C2410C",
    cream: "#FFF8EE",
    ink: "#2B1416",
    muted: "#6B5E5E"
  }
};
