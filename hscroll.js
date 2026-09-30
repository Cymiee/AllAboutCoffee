/**
 * hscroll.js
 * ----------
 * Scroll down, move sideways. A section marked [data-hscroll] becomes a tall
 * runway with a sticky "pin" inside it; while the pin is stuck, vertical
 * scroll is mapped 1:1 onto the horizontal position of the card track.
 *
 * Progressive enhancement: without this script (or with reduced motion) the
 * track is an ordinary swipeable horizontal row, styled in CSS. This script
 * only adds [data-hscroll-active], which switches on the pinned layout.
 *
 * Markup contract (see index.html):
 *   [data-hscroll]           the section (becomes the runway)
 *   [data-hscroll-pin]       sticky viewport-height frame
 *   [data-hscroll-viewport]  clips the track
 *   [data-hscroll-track]     the row that moves
 *   [data-hscroll-bar]       optional progress bar fill
 *   [data-hscroll-step]      optional: items on a timeline axis. The track
 *                            gets --axis-start/--axis-len/--axis-fill (px)
 *                            for drawing the line, and each step gets
 *                            .is-reached once the fill has passed it.
 */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const nav = document.querySelector(".top-nav");

  document.querySelectorAll("[data-hscroll]").forEach((section) => {
    const pin = section.querySelector("[data-hscroll-pin]");
    const viewport = section.querySelector("[data-hscroll-viewport]");
    const track = section.querySelector("[data-hscroll-track]");
    const bar = section.querySelector("[data-hscroll-bar]");
    const steps = Array.from(section.querySelectorAll("[data-hscroll-step]"));
    if (!pin || !viewport || !track) return;

    let axisStart = 0, axisLen = 0;
    // The axis runs from the first step's leading edge to the last one's.
    function measureAxis() {
      if (!steps.length) return;
      axisStart = steps[0].offsetLeft;
      axisLen = steps[steps.length - 1].offsetLeft - axisStart;
      track.style.setProperty("--axis-start", `${axisStart}px`);
      track.style.setProperty("--axis-len", `${axisLen}px`);
    }
    // The fill tip sweeps first dot -> last dot across the whole travel, so
    // it reaches the final step exactly as the row does.
    function setFill(p) {
      if (!steps.length) return;
      const fill = p * axisLen;
      track.style.setProperty("--axis-fill", `${fill}px`);
      for (const s of steps) s.classList.toggle("is-reached", s.offsetLeft - axisStart <= fill + 1);
    }

    let distance = 0, raf = 0, visible = true;

    function layout() {
      if (reduceMotion.matches) {
        // Hand back to the native swipeable row, with the whole axis lit.
        section.removeAttribute("data-hscroll-active");
        section.style.height = "";
        track.style.transform = "";
        measureAxis();
        setFill(1);
        return;
      }
      section.setAttribute("data-hscroll-active", "");
      // The sticky header covers the top of the pin; CSS pads by its height.
      section.style.setProperty("--hscroll-nav", `${nav ? nav.offsetHeight : 0}px`);
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      // One pin-height of runway, plus exactly as much as the row must travel.
      section.style.height = `${pin.offsetHeight + distance}px`;
      measureAxis();
      paint();
    }

    function paint() {
      raf = 0;
      if (!section.hasAttribute("data-hscroll-active")) return;
      const p = distance ? clamp(-section.getBoundingClientRect().top / distance) : 0;
      track.style.transform = `translate3d(${-p * distance}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p})`;
      setFill(p);
    }

    const schedule = () => { if (!raf && visible) raf = requestAnimationFrame(paint); };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", layout);
    reduceMotion.addEventListener("change", layout);
    new ResizeObserver(layout).observe(track);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) schedule();
    }, { rootMargin: "50% 0px" }).observe(section);

    layout();
  });
})();
