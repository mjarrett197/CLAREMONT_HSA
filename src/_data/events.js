// Events. Single source of truth for the Events calendar and the "Coming up"
// list on the home page.
//
// To add an event, copy one block and change it.
//   date   YYYY-MM-DD
//   start  24-hour time, e.g. "18:00" for 6 PM. Leave "" for an all-day event.
//   end    optional, e.g. "21:00"
// The site sorts events, groups them by month, and moves past events to
// "Past events" by itself each time it is rebuilt.
//
// These are EXAMPLES to replace. Nothing here is a real CHS event yet.

module.exports = [
  {
    id: "example-diwali",
    title: "Diwali Celebration (example)",
    date: "2026-11-08",
    start: "18:00",
    end: "21:00",
    location: "REPLACE WITH LOCATION",
    description: "Example event. Replace with the real details.",
    link: ""   // optional RSVP or flyer link
  },
  {
    id: "example-aarti",
    title: "Aarti & Bhajans (example)",
    date: "2026-11-13",
    start: "19:00",
    end: "",
    location: "REPLACE WITH LOCATION",
    description: "Example event. Replace or delete.",
    link: ""
  },
  {
    id: "example-meditation",
    title: "Finals Week Meditation (example)",
    date: "2026-12-07",
    start: "17:30",
    end: "18:30",
    location: "REPLACE WITH LOCATION",
    description: "Example event. Replace or delete.",
    link: ""
  },
  {
    id: "example-navratri",
    title: "Navratri Garba Night (example)",
    date: "2026-10-10",
    start: "19:00",
    end: "22:00",
    location: "REPLACE WITH LOCATION",
    description: "Example of a past event. It shows under Past events because its date has gone by.",
    link: ""
  }
];
