/**
 * main.js
 * ----------
 * Site-wide UI interactions:
 * - Smooth anchor scrolling
 * - Drinks gallery modal
 * - Scroll reveal animations
 * - Hero background parallax
 * - Scrollspy nav highlighting
 *
 * Wrapped in an IIFE to avoid polluting the global scope.
 */
(() => {
  "use strict";

  // =========================
  // Settings / helpers
  // =========================
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // =========================
  // 1) Smooth anchor scrolling
  // =========================
  function initSmoothAnchors() {
    const anchorLinks = qsa('a[href^="#"]');

    anchorLinks.forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (!href || href === "#") return;

        const target = qs(href);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });

        // Keep URL hash in sync without adding browser history entries
        history.replaceState(null, "", href);
      });
    });
  }

  // =========================
  // 2) Scroll reveal animations
  // =========================
  function initScrollReveal() {
    const revealTargets = qsa(".reveal, .card");

    // Ensure everything we want to animate has .reveal class
    revealTargets.forEach((el) => el.classList.add("reveal"));

    if (prefersReducedMotion) {
      // Immediately reveal without animation
      revealTargets.forEach((el) => el.classList.add("in"));
      return;
    }

    const revealObs = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach((el) => revealObs.observe(el));
  }

  // =========================
  // 4) Hero background parallax
  // =========================
  function initHeroParallax() {
    const heroBg = qs(".hero-bg");
    if (!heroBg || prefersReducedMotion) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        heroBg.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(1.06)`;
        ticking = false;
      });
    };

    // Run once + on scroll
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // =========================
  // 5) Scrollspy + active nav
  // =========================
  function initNavHighlighting() {
    const navLinks = qsa(".nav-links a");

    // Highlight brew.html when you're on that file
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    navLinks.forEach((a) => {
      if ((a.getAttribute("href") || "").toLowerCase() === file) {
        a.classList.add("active");
      }
    });

    // Only run scrollspy on home page (your main has data-page="home")
    const home = qs('main[data-page="home"]');
    if (!home) return;

    const hashLinks = navLinks.filter((a) =>
      (a.getAttribute("href") || "").startsWith("#")
    );
    if (!hashLinks.length) return;

    const linkByHash = new Map(hashLinks.map((a) => [a.getAttribute("href"), a]));
    const sections = hashLinks
      .map((a) => qs(a.getAttribute("href")))
      .filter(Boolean);

    const setActive = (hash) => {
      navLinks.forEach((a) => a.classList.remove("active"));
      const hit = linkByHash.get(hash);
      if (hit) hit.classList.add("active");
    };

    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;

        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        setActive(`#${visible[0].target.id}`);
      },
      {
        rootMargin: "-45% 0px -50% 0px",
        threshold: [0.01, 0.1, 0.2, 0.4],
      }
    );

    sections.forEach((s) => spy.observe(s));
  }

  // =========================
  // 6) Theme toggle
  // =========================
  function initThemeToggle() {
    // Restore saved preference before anything renders
    const saved = localStorage.getItem("aac-theme");
    if (saved === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    }

    const btn = document.getElementById("btnTheme");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("aac-theme", "light");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("aac-theme", "dark");
      }
    });
  }

  // =========================
  // Boot
  // =========================
  initThemeToggle();
  initSmoothAnchors();
  initScrollReveal();
  initHeroParallax();
  initNavHighlighting();
})();