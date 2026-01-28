(() => {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Smooth anchor clicks (works even if scroll-behavior is disabled somewhere)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", href);
    });
  });

  // Scroll reveal (cards + anything with .reveal)
  const revealTargets = Array.from(document.querySelectorAll(".reveal, .card"));
  revealTargets.forEach(el => el.classList.add("reveal"));

  if (prefersReduced) {
    revealTargets.forEach(el => el.classList.add("in"));
  } else {
    const revealObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealTargets.forEach(el => revealObs.observe(el));
  }

  // Parallax hero background (subtle)
  const heroBg = document.querySelector(".hero-bg");
  if (heroBg && !prefersReduced) {
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

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Scrollspy (active nav link while scrolling) – only on the home page
  const home = document.querySelector('main[data-page="home"]');
  const navLinks = Array.from(document.querySelectorAll(".nav-links a"));
  const hashLinks = navLinks.filter(a => (a.getAttribute("href") || "").startsWith("#"));

  // If we're on brew.html, highlight that link
  const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  navLinks.forEach(a => {
    if ((a.getAttribute("href") || "").toLowerCase() === file) a.classList.add("active");
  });

  if (home && hashLinks.length) {
    const linkByHash = new Map(hashLinks.map(a => [a.getAttribute("href"), a]));
    const sections = hashLinks
      .map(a => document.querySelector(a.getAttribute("href")))
      .filter(Boolean);

    const setActive = (hash) => {
      navLinks.forEach(a => a.classList.remove("active"));
      const hit = linkByHash.get(hash);
      if (hit) hit.classList.add("active");
    };

    const spy = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;

      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      setActive("#" + visible[0].target.id);
    }, {
      rootMargin: "-45% 0px -50% 0px",
      threshold: [0.01, 0.1, 0.2, 0.4]
    });

    sections.forEach(s => spy.observe(s));
  }
})();