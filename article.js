/**
 * article.js
 * ----------
 * Powers the individual guide pages in guides/.
 * - Reading progress bar
 * - Table of contents built from the <h2>s in the article body
 * - "Related guides" pulled from articles.js
 *
 * Reads the current article's slug from <main data-slug="...">.
 * Depends on articles.js being loaded first.
 */
(() => {
  "use strict";

  const main = document.querySelector('main[data-page="article"]');
  if (!main) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ── 1) Reading progress bar ──
  function initProgress() {
    const bar = document.getElementById("readingProgress");
    if (!bar) return;

    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  // ── 2) Table of contents ──
  function initToc() {
    const tocEl = document.getElementById("articleToc");
    const body = document.querySelector(".article-body");
    if (!tocEl || !body) return;

    const headings = Array.from(body.querySelectorAll("h2"));
    if (!headings.length) {
      tocEl.closest(".article-aside")?.remove();
      return;
    }

    // Give every heading a stable id so the TOC can link to it.
    headings.forEach((h, i) => {
      if (!h.id) {
        h.id =
          h.textContent
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || `section-${i + 1}`;
      }
    });

    tocEl.innerHTML = headings
      .map((h) => `<li><a href="#${h.id}">${h.textContent}</a></li>`)
      .join("");

    // Highlight whichever section you're reading.
    const links = new Map(
      Array.from(tocEl.querySelectorAll("a")).map((a) => [
        a.getAttribute("href").slice(1),
        a,
      ])
    );

    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        links.forEach((a) => a.classList.remove("is-active"));
        links.get(visible[0].target.id)?.classList.add("is-active");
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.01, 0.25, 0.6] }
    );
    headings.forEach((h) => spy.observe(h));

    // Smooth scroll (main.js only wires anchors present at load).
    tocEl.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      const target = document.getElementById(a.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      history.replaceState(null, "", a.getAttribute("href"));
    });
  }

  // ── 3) Related guides ──
  function initRelated() {
    const wrap = document.getElementById("relatedGrid");
    if (!wrap || typeof ARTICLES === "undefined") return;

    const slug = main.dataset.slug;
    const current = ARTICLES.find((a) => a.slug === slug);
    const others = ARTICLES.filter((a) => a.slug !== slug);

    // Prefer guides sharing a tag, then fill up to 2 with anything else.
    const sameTag = others.filter((a) => current && a.tag === current.tag);
    const rest = others.filter((a) => !sameTag.includes(a));
    const picks = [...sameTag, ...rest].slice(0, 2);

    wrap.innerHTML = picks.map((a) => articleCardHTML(a, "../")).join("");
    if (window.refreshReveal) window.refreshReveal(wrap);
  }

  initProgress();
  initToc();
  initRelated();
})();
