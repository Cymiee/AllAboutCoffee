/**
 * home-guides.js
 * --------------
 * Renders the three most recent guides into the homepage teaser section.
 * Depends on articles.js.
 */
(() => {
  "use strict";
  const grid = document.getElementById("homeGuideGrid");
  if (!grid || typeof ARTICLES === "undefined") return;

  grid.innerHTML = ARTICLES.slice(0, 3)
    .map((a) => articleCardHTML(a))
    .join("");

  if (window.refreshReveal) window.refreshReveal(grid);
})();
