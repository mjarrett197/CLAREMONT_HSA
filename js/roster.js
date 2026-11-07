// Adds members approved on the admin page (/api/roster) to the Members page
// and the home page's "Our members" counts. The pages already show anyone
// listed in src/_data/members.js; this only adds to them. If /api/roster
// can't be reached, the pages simply stay as built.
(function () {
  "use strict";
  var dataEl = document.getElementById("roster-data");
  if (!dataEl || !window.fetch) return;
  var base = JSON.parse(dataEl.textContent);
  var colleges = base.colleges, staticMembers = base.members || [];

  fetch("/api/roster", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .catch(function () { return []; })
    .then(function (live) {
      if (!Array.isArray(live) || !live.length) return;
      var key = function (m) { return (String(m.name) + "|" + m.college).toLowerCase(); };
      var seen = {};
      staticMembers.forEach(function (m) { seen[key(m)] = true; });
      var all = staticMembers.concat(live.filter(function (m) { return m && m.name && !seen[key(m)]; }));
      renderMembersPage(all);
      renderHome(all);
    });

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function of(all, id) {
    return all.filter(function (m) { return m.college === id; })
      .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }

  function renderMembersPage(all) {
    var grid = document.getElementById("roster-grid");
    if (!grid) return;
    grid.replaceChildren.apply(grid, colleges.map(function (c) {
      var people = of(all, c.id);
      var sec = el("section", "roster-college"); sec.id = c.id;
      var head = el("header");
      head.append(el("h2", null, c.name), el("span", "roster-count", String(people.length)));
      sec.append(head);
      if (people.length) {
        var ul = el("ul");
        people.forEach(function (m) {
          var li = el("li", null, m.name);
          if (m.gradYear) { li.append(" "); li.append(el("span", null, "’" + String(m.gradYear % 100).padStart(2, "0"))); }
          ul.append(li);
        });
        sec.append(ul);
      } else {
        var p = el("p", "roster-empty", "No members listed yet. ");
        var a = el("a", null, "Be the first →"); a.href = "/join/";
        p.append(a); sec.append(p);
      }
      return sec;
    }));
    grid.hidden = false;
    document.getElementById("roster-start").hidden = true;
    document.getElementById("roster-total-count").textContent = all.length + " member" + (all.length === 1 ? "" : "s");
    document.getElementById("roster-total").hidden = false;
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
  }

  function renderHome(all) {
    var section = document.getElementById("home-members");
    var chips = document.getElementById("home-member-chips");
    if (!section || !chips) return;
    chips.replaceChildren.apply(chips, colleges.map(function (c) {
      var n = of(all, c.id).length;
      var a = el("a", "college-chip"); a.href = "/members/#" + c.id;
      a.append(el("strong", null, c.short), el("span", null, n + " member" + (n === 1 ? "" : "s")));
      return a;
    }));
    section.hidden = false;
  }
})();
