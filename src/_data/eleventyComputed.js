// Flags every template can use, worked out from the data files.
module.exports = {
  // About page exists once it has any text or any board member.
  hasAbout: (data) => Boolean(data.about.objective || data.about.boardNote || data.about.requirements.length || data.board.length),
  // Contact page and footer column exist once there's a way to reach CHS.
  hasContact: (data) => Boolean(data.site.contact.email || data.site.social.instagram || data.site.social.linktree)
};
