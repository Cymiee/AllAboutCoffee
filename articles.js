/**
 * articles.js
 * -----------
 * The single source of truth for the Guides section.
 *
 * TO ADD A NEW GUIDE:
 *   1. Add an entry to the ARTICLES array below.
 *   2. Create guides/<slug>.html (copy any existing guide as a template).
 * The hub page, the tag filters and the "related guides" links all read
 * from this array, so there is nothing else to update.
 *
 * Set `draft: false` once you've written the real content — that removes
 * the "Draft" badge from the card and the article page.
 */
const ARTICLES = [
  {
    slug: "healthy-coffee",
    title: "The Healthy Coffee Guide",
    dek: "Which coffees are actually good for you — and which café habits quietly undo the benefits.",
    tag: "Health",
    readTime: 6,
    draft: true,
  },
  {
    slug: "cappuccino-latte-flat-white",
    title: "Cappuccino vs Latte vs Flat White",
    dek: "Three drinks, the same two ingredients. The difference is all in the milk.",
    tag: "Drinks",
    readTime: 5,
    draft: true,
  },
  {
    slug: "tasting-notes",
    title: "Why You Can't Taste the Notes on Your Coffee Bag",
    dek: "Your bag promises blueberry and jasmine. You taste… coffee. Here's what's going on.",
    tag: "Tasting",
    readTime: 7,
    draft: true,
  },
  {
    slug: "origins",
    title: "Coffees From Different Countries: What Actually Changes?",
    dek: "Ethiopia, Colombia, Sumatra — why origin changes the cup more than the roast does.",
    tag: "Origins",
    readTime: 8,
    draft: true,
  },
  {
    slug: "storing-coffee",
    title: "How to Store Coffee So It Stays Fresh",
    dek: "The freezer debate, settled — plus the four things that actually stale your beans.",
    tag: "Basics",
    readTime: 4,
    draft: true,
  },
  {
    slug: "decaf",
    title: "Decaf, Explained",
    dek: "How the caffeine comes out, whether it hurts the flavour, and what to look for on the bag.",
    tag: "Health",
    readTime: 5,
    draft: true,
  },
];

/* Shared by the hub and the article pages. */
function articleCardHTML(a, prefix = "") {
  return `
    <a class="guide-card reveal" href="${prefix}guides/${a.slug}.html">
      <div class="guide-card__top">
        <span class="chip">${a.tag}</span>
        ${a.draft ? '<span class="guide-card__draft">Draft</span>' : ""}
      </div>
      <h3 class="guide-card__title">${a.title}</h3>
      <p class="guide-card__dek">${a.dek}</p>
      <span class="guide-card__meta">${a.readTime} min read →</span>
    </a>`;
}
