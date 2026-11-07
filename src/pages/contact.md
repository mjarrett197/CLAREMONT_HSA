---js
{
  title: "Contact",
  subtitle: "Get in touch with the CHS board",
  layout: "page.njk",
  // Hidden until there is a way to reach CHS (src/_data/site.js).
  permalink: (data) => (data.site.contact.email || data.site.social.instagram || data.site.social.linktree) ? "/contact/" : false,
  seoTitle: "Contact | Claremont Hindu Society",
  seoDescription: "Contact the Claremont Hindu Society."
}
---

For questions, collaborations or event ideas, reach us at:

{% if site.contact.email %}**Email:** [{{ site.contact.email }}](mailto:{{ site.contact.email }})

{% endif %}{% if site.social.instagram %}**Instagram:** [{{ site.social.instagram }}]({{ site.social.instagram }})

{% endif %}{% if site.social.linktree %}**All our links:** [{{ site.social.linktree }}]({{ site.social.linktree }}){% endif %}
