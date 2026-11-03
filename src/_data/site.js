// Sitewide settings. Name, links, contact and colours live here so a change
// is made once rather than on every page.
//
// Anything starting with REPLACE is a placeholder to swap for the real value.
// The two QR codes are generated from `url` and `wellness.url` below, so they
// update by themselves on the next build once these are real.

module.exports = {
  name: "Claremont Hindu Students Association",
  short: "CHSA",
  tagline: "A home for Hindu students and friends across the Claremont Colleges",
  // Netlify test address for now. Change to the real domain once bought;
  // the Become a Member QR code follows this on the next build.
  url: "https://claremont-hsa.netlify.app",

  // While true: search engines are asked not to list the site, and a thin
  // banner tells visitors it's a preview. Set to false at launch.
  testMode: true,
  contact: {
    email: "REPLACE@example.com"
  },
  // Leave a link as "" to hide it.
  social: {
    instagram: "",
    linktree: ""
  },

  // HSCI Student Wellness Center. CHSA links to it; HSCI runs it.
  wellness: {
    name: "HSCI Student Wellness Center",
    url: "https://REPLACE-WITH-HSCI-WELLNESS-CENTER-LINK",
    // Each of these can point to its own page on the HSCI site. Leave "" to
    // send that card to the main Wellness Center link above.
    yogaUrl: "",
    videosUrl: "",
    conversationUrl: "",
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
