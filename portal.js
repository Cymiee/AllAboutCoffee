/**
 * portal.js
 * ---------
 * Scroll-driven camera that flies through a letter of a word.
 *
 * The word is rendered as an SVG <clipPath>. A "field" layer sits behind it
 * and is clipped to the letterforms, so the type reads as a window. On scroll
 * the clip scales up around the inside of one letter until that opening fills
 * the viewport — at which point the clip is dropped and you are through.
 *
 * Technique ported from Christian Katzmann's Glyph Portal (MIT). The original
 * is a React component, but the animation is plain DOM + SVG, so nothing here
 * needs a framework.
 *
 * Markup contract (see index.html):
 *   [data-portal]          the scroll container
 *   [data-portal-pin]      the sticky viewport
 *   [data-portal-field]    the layer revealed through the letters
 *   [data-portal-glyph]    the <text> inside the clipPath
 *   [data-portal-content]  what you land on after passing through
 */
(() => {
  "use strict";

  const section = document.querySelector("[data-portal]");
  if (!section) return;

  const pin = section.querySelector("[data-portal-pin]");
  const field = section.querySelector("[data-portal-field]");
  const art = section.querySelector("[data-portal-art]");
  const glyph = section.querySelector("[data-portal-glyph]");
  const clip = section.querySelector("#portalClip");
  if (!pin || !field || !art || !glyph || !clip) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const text = (glyph.textContent || "COFFEE").trim();
  const focusChar = section.dataset.portalFocus || "O";
  const travelScreens = Number(section.dataset.portalLength) || 2.4;

  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));

  let W = 1, H = 1, travel = 1;
  let startScale = 1, endScale = 1;
  let bounds = null, focus = null;
  let ready = false, raf = 0, dirty = true, visible = true;

  /**
   * Largest fully-opaque square inside a glyph, found in one pass.
   * A stem-width guess breaks on round letters; this works on O, S and Ø.
   * Returns centre + radius in 100px-font units.
   */
  function interior(ctx, char, font) {
    const canvas = ctx.canvas;
    ctx.font = font;
    const m = ctx.measureText(char);
    const pad = 8;
    const left = Math.ceil(m.actualBoundingBoxLeft);
    const ascent = Math.ceil(m.actualBoundingBoxAscent);
    canvas.width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2);
    canvas.height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
    ctx.font = font;                 // resizing the canvas resets the context
    ctx.fontKerning = "none";
    ctx.fillText(char, pad + left, pad + ascent);

    const { width, height } = canvas;
    const px = ctx.getImageData(0, 0, width, height).data;
    const rows = new Uint16Array(width + 1);
    let size = 0, bx = 0, by = 0;
    for (let y = 0; y < height; y++) {
      let diagonal = 0;
      for (let x = 0; x < width; x++) {
        const above = rows[x + 1];
        rows[x + 1] = px[(y * width + x) * 4 + 3] > 245
          ? Math.min(above, rows[x], diagonal) + 1
          : 0;
        diagonal = above;
        if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
      }
    }
    if (size < 3) return null;
    // Scanned at 3x the SVG font size; divide back, and inscribe a disk in the
    // square with a pixel of slack for raster disagreement.
    return {
      x: (bx + 1 - size / 2 - pad - left) / 3,
      y: (by + 1 - size / 2 - pad - ascent) / 3,
      radius: (size / 2 - 1) / 3,
    };
  }

  /** Measure the word and locate the letter we fly through. */
  function measure() {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    const cs = getComputedStyle(glyph);
    const family = cs.fontFamily;
    const weight = cs.fontWeight;
    ctx.font = `${weight} 100px ${family}`;
    ctx.fontKerning = "none";

    const m = ctx.measureText(text);
    bounds = {
      x: -m.actualBoundingBoxLeft,
      y: -m.actualBoundingBoxAscent,
      width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
      height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    };
    if (!bounds.width || !bounds.height) return false;

    // Take every advance before interior() starts resizing the canvas: a
    // resize resets the context, which silently turns kerning back on and
    // shifts each letter away from where the SVG (kerning: none) draws it.
    const advances = Array.from({ length: text.length },
      (_, i) => ctx.measureText(text.slice(0, i)).width);

    // Find every candidate opening, then prefer the requested character.
    const wanted = text.indexOf(focusChar);
    const found = [];
    for (let i = 0; i < text.length; i++) {
      const hit = interior(ctx, text[i], `${weight} 300px ${family}`);
      if (hit) found.push({ ...hit, x: hit.x + advances[i], index: i });
    }
    if (!found.length) return false;

    focus = found.find((f) => f.index === wanted)
      || found.slice().sort((a, b) => b.radius - a.radius)[0];
    return true;
  }

  function layout() {
    if (!pin.clientWidth) return;
    W = pin.clientWidth;
    H = Math.max(1, pin.clientHeight);
    travel = H * travelScreens;
    art.setAttribute("viewBox", `0 0 ${W} ${H}`);

    if (!ready) { ready = measure(); if (!ready) return; }

    startScale = Math.min(W * 0.86 / bounds.width, H * 0.34 / bounds.height);
    // Grow until the letter's opening covers the viewport's diagonal.
    endScale = Math.max(startScale, Math.hypot(W, H) / (focus.radius * 1.35));
    section.dataset.portalReady = "true";
  }

  function paint(p) {
    const t = clamp(p / 0.78);
    const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
    const scale = Math.exp(Math.log(startScale) + Math.log(endScale / startScale) * eased);

    // Ease the camera from the word's centre onto the chosen letter, so the
    // opening frame is the whole word rather than an off-centre crop.
    const blend = endScale === startScale ? 0
      : (1 / scale - 1 / startScale) / (1 / endScale - 1 / startScale);
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;
    const cx = midX + (focus.x - midX) * blend;
    const cy = midY + (focus.y - midY) * blend;

    // Scale lives on the clip (text paint has size limits); the text carries
    // only translation, which survives page zoom in WebKit.
    clip.setAttribute("transform", `scale(${scale})`);
    glyph.setAttribute("transform", `translate(${W / 2 / scale - cx} ${H / 2 / scale - cy})`);

    field.style.clipPath = t >= 1 ? "none" : "url(#portalClip)";
    section.style.setProperty("--portal-caption", String(1 - clamp(p / 0.14)));
    section.style.setProperty("--portal-reveal", String(clamp((p - 0.74) / 0.16)));
    section.style.setProperty("--portal-field-scale", String(1 + 0.18 * clamp(p / 0.82)));
    section.dataset.portalEntered = String(p >= 0.88);
  }

  function progress() {
    return clamp(-section.getBoundingClientRect().top / travel);
  }

  function frame() {
    raf = 0;
    if (dirty) { dirty = false; layout(); }
    if (ready) paint(reduceMotion.matches ? 1 : progress());
  }
  const schedule = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
  const resize = () => { cancelAnimationFrame(raf); raf = 0; dirty = true; frame(); };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(section);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) schedule(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: "100% 0px" }).observe(section);
  reduceMotion.addEventListener("change", resize);

  // This script runs at DOMContentLoaded, usually before the webfont lands,
  // so the first measurement locates the letter in the *fallback* face. When
  // the real face swaps in, the ink moves out from under the camera and it
  // flies into black. Paint once now, then re-measure once this exact face
  // has loaded. (layout() only measures while !ready, so reset it first.)
  const remeasure = () => { ready = false; resize(); };
  frame();
  if (document.fonts) {
    const cs = getComputedStyle(glyph);
    document.fonts.load(`${cs.fontWeight} 100px ${cs.fontFamily}`, text).then(remeasure, () => {});
    document.fonts.addEventListener("loadingdone", remeasure);
  }
})();
