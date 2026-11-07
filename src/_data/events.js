// Events. Single source of truth for the Events calendar and the "Coming up"
// list on the home page.
//
// To add an event, copy one block and change it.
//   date   YYYY-MM-DD
//   start  24-hour time, e.g. "18:00" for 6 PM. Leave "" for an all-day event.
//   end    optional, e.g. "21:00". Leave "" if not confirmed.
// The site sorts events, groups them by month, and moves past events to
// "Past events" by itself each time it is rebuilt.

module.exports = [
  {
    id: "diwali-2026",
    title: "Diwali Celebration",
    date: "2026-11-08",
    start: "18:00",
    end: "",          // end time to be confirmed with the students
    location: "McKenna Auditorium, Claremont McKenna College",
    description: "",
    link: ""   // optional RSVP or flyer link
  }
];
