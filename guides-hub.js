/**
 * guides-hub.js
 * -------------
 * Powers guides.html: renders the card grid from ARTICLES (articles.js),
 * plus tag filtering and live text search.
 *
 * Depends on articles.js being loaded first.
 */
(() => {
  "use strict";

  const grid = document.getElementById("guideGrid");
  if (!grid || typeof ARTICLES === "undefined") return;

  const filtersEl = document.getElementById("guideFilters");
  const searchEl = document.getElementById("guideSearch");
  const countEl = document.getElementById("guideCount");
  const emptyEl = document.getElementById("guideEmpty");
  const resetEl = document.getElementById("guideReset");

  let activeTag = "All";
  let query = "";

  // ── Build the filter chips from the tags actually in use ──
  const tags = ["All", ...new Set(ARTICLES.map((a) => a.tag))];
  filtersEl.innerHTML = tags
    .map(
      (t) =>
        `<button class="guide-filter${t === "All" ? " is-active" : ""}" data-tag="${t}" aria-pressed="${t === "All"}">${t}</button>`
    )
    .join("");

  // ── Filtering ──
  function matches(a) {
    const byTag = activeTag === "All" || a.tag === activeTag;
    if (!byTag) return false;
    if (!query) return true;
    const haystack = `${a.title} ${a.dek} ${a.tag}`.toLowerCase();
    return haystack.includes(query);
  }

  function render() {
    const visible = ARTICLES.filter(matches);

    grid.innerHTML = visible.map((a) => articleCardHTML(a)).join("");
    emptyEl.hidden = visible.length > 0;
    countEl.textContent = visible.length
      ? `${visible.length} guide${visible.length === 1 ? "" : "s"}`
      : "";

    // Newly injected cards need the site-wide reveal animation applied.
    if (window.refreshReveal) window.refreshReveal(grid);
  }

  // ── Events ──
  filtersEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".guide-filter");
    if (!btn) return;
    activeTag = btn.dataset.tag;
    filtersEl.querySelectorAll(".guide-filter").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    render();
  });

  searchEl.addEventListener("input", () => {
    query = searchEl.value.trim().toLowerCase();
    render();
  });

  resetEl.addEventListener("click", () => {
    activeTag = "All";
    query = "";
    searchEl.value = "";
    filtersEl.querySelectorAll(".guide-filter").forEach((b) => {
      const on = b.dataset.tag === "All";
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    render();
  });

  render();
})();
