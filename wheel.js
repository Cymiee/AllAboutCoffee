/**
 * wheel.js
 * --------
 * The drinks as a wheel you turn by scrolling. At rest the cards sit in a
 * ring around the section title, each tangent to the circle. The first
 * stretch of scroll blows the ring open into a vertical drum: the card at
 * the front lies flat and full size, its neighbours rotate away into hard
 * perspective and swing back along an arc to the left. Keep scrolling and
 * the drum carries the next drink round to the front.
 *
 * Geometry and transform chain ported from the WorksWheel component
 * (crafterui). The original turns on wheel/drag events inside its own box
 * with touch-action: pan-x, which on a phone blocks vertical scrolling over
 * a full-width section and traps the page. Here `turn` is driven by page
 * scroll through a sticky pin instead, like the portal: nothing to trap.
 *
 * The whole state is one number, `turn`: 0 is the ring, 1 is the drum with
 * drink 0 at the front, and each whole number after that is one more drink
 * turned past. Progressive enhancement: without this script, or with
 * reduced motion, the section stays the plain card grid.
 */
(() => {
  "use strict";

  const section = document.querySelector("[data-wheel]");
  if (!section) return;
  // A spinning 3D drum is exactly the large motion reduced-motion users opt
  // out of. They keep the static grid.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const pin = section.querySelector("[data-wheel-pin]");
  const stage = section.querySelector("[data-wheel-stage]");
  const drum = section.querySelector("[data-wheel-drum]");
  const label = section.querySelector("[data-wheel-label]");
  const title = section.querySelector("[data-wheel-title]");
  const index = section.querySelector("[data-wheel-index]");
  const cards = Array.from(section.querySelectorAll("[data-wheel-card]"));
  const nav = document.querySelector(".top-nav");
  if (!pin || !stage || !drum || !cards.length) return;

  /* Geometry, tuned together in the original. The card is measured against
     the stage; everything else against the card, so a narrow stage scales
     the whole wheel down rather than swinging a small card on a huge drum. */
  const CARD_H = 0.38;       // front card height, of the stage
  const CARD_MAX_W = 0.34;   // ...but never wider than this much of it
  const CARD_MAX_W_NARROW = 0.8;
  const CARD_RATIO = 1.45;   // card width / height
  const STEP = 40;           // degrees between cards on the drum
  const DRUM = 2.22;         // drum radius, in card heights (as below)
  const LENS = 2.7;          // perspective distance
  const RING_R = 1.14;       // ring radius
  const BOW = 1.82;          // radius of the arc the strip curves back along
  const CULL = 1.6;          // items either side of the front worth drawing
  const EASE = 0.12;         // fraction of the remaining distance per frame
  const SCROLL_PER_ITEM = 0.55; // viewport heights of scroll per drink
  const NARROW = 700;

  const count = cards.length;
  const last = count - 1;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rad = (d) => (d * Math.PI) / 180;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /** How far left the arc has carried a card turned `deg` off the front.
      Zero at the front, so the drink being read stays centred. */
  const bowAt = (deg, bow) => -bow * (1 - Math.cos(rad(deg)));

  /** Ring and drum in one chain: ring terms fall away as m -> 1, drum terms
      are zero while the ring is up. The bow comes first, in the wheel's own
      plane, so it slides the card sideways rather than turning with it. */
  const place = (ringDeg, drumDeg, g, m, scale) =>
    `translateX(${m * bowAt(drumDeg, g.bow)}px)` +
    ` rotateZ(${(1 - m) * ringDeg}deg) translateY(${-(1 - m) * g.ringR}px)` +
    ` rotateX(${m * drumDeg}deg) translateZ(${m * g.drumR}px)` +
    ` scale(${scale})`;

  let g = null;              // measured geometry
  let H = 1, runway = 1;
  let turn = 0, target = 0, raf = 0, active = -1;

  // ---------- index down the side ----------
  const names = cards.map((c) => c.querySelector(".drink-card__name")?.textContent.trim() || "");
  if (index) {
    index.innerHTML = names.map((n, i) =>
      `<li><button type="button" data-wheel-go="${i}">${n}</button></li>`).join("");
    index.addEventListener("click", (e) => {
      const b = e.target.closest("[data-wheel-go]");
      if (!b) return;
      // Scroll the page to the point where that drink is held at the front.
      const i = Number(b.dataset.wheelGo);
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + ((i + 1) / count) * (runway - H) });
    });
  }

  // ---------- the panel beside the front card ----------
  function setActive(i) {
    if (i === active) return;
    active = i;
    const c = cards[i];
    const pick = (sel) => c.querySelector(sel)?.innerHTML || "";
    if (title) {
      title.innerHTML =
        `<p class="wheel__tagline">${pick(".drink-card__tagline")}</p>` +
        `<h3 class="wheel__name">${pick(".drink-card__name")}</h3>` +
        `<p class="wheel__desc">${pick(".drink-card__desc")}</p>` +
        `<div class="wheel__tags">${pick(".drink-card__tags")}</div>`;
    }
    index?.querySelectorAll("button").forEach((b, j) =>
      b.classList.toggle("is-active", j === i));
  }

  // ---------- layout ----------
  function layout() {
    section.setAttribute("data-wheel-active", "");
    section.style.setProperty("--wheel-nav", `${nav ? nav.offsetHeight : 0}px`);
    H = pin.offsetHeight;
    runway = H + count * SCROLL_PER_ITEM * H;
    section.style.height = `${runway}px`;

    const w = stage.clientWidth, h = stage.clientHeight;
    const narrow = w < NARROW;
    const cardW = Math.min(h * CARD_H * CARD_RATIO, w * (narrow ? CARD_MAX_W_NARROW : CARD_MAX_W));
    const cardH = cardW / CARD_RATIO;
    // The ring is derived from the card, which is fine at the original 34%
    // width cap -- but the larger narrow-screen card would push the ring off
    // both edges. Cap its radius against the stage so it always fits.
    const ringR = Math.min(cardH * RING_R, w * 0.3);
    g = {
      cardW, cardH, ringR,
      drumR: cardH * DRUM,
      bow: cardH * BOW,
      // Shrink ring cards until the circle reads as a closed loop.
      ringScale: clamp((((2 * Math.PI * ringR) / count) * 0.82) / cardW, 0.16, 1),
    };

    stage.style.perspective = `${cardH * LENS}px`;
    stage.style.setProperty("--wheel-label-size", `${Math.max(22, cardH * 0.16)}px`);
    // Clear space inside the ring (ring cards are tangent, so each reaches
    // half its scaled height inward). The label wraps to fit it.
    stage.style.setProperty("--wheel-ring-inner", `${Math.max(120, 2 * (ringR - (cardH * g.ringScale) / 2) - 16)}px`);
    // Title panel may not run under the front card.
    const cardLeft = w / 2 - cardW / 2;
    section.style.setProperty("--wheel-title-max", `${Math.max(180, cardLeft - Math.max(20, (w - 1100) / 2) - 28)}px`);
    for (const c of cards) {
      Object.assign(c.style, {
        width: `${cardW}px`, height: `${cardH}px`,
        marginLeft: `${-cardW / 2}px`, marginTop: `${-cardH / 2}px`,
      });
    }
    target = targetFromScroll();
    turn = target;          // no glide on first paint or after a resize
    draw();
  }

  /** Page scroll -> turn. Each drink holds at the front for the middle 40%
      of its stretch (the smoothstep's flat ends), so the drum settles onto a
      card instead of stopping between two. */
  function targetFromScroll() {
    const p = clamp(-section.getBoundingClientRect().top / (runway - H), 0, 1);
    const x = p * count;
    const n = Math.min(Math.floor(x), count);
    return n >= count ? count : n + smooth(0.2, 0.8, x - n);
  }

  // ---------- draw ----------
  function draw() {
    const m = clamp(turn, 0, 1);
    const pos = Math.max(0, turn - 1);

    // Pull the drum back so its front face lands on the picture plane. The
    // set-back arrives with the drum, or the ring would render at half size.
    drum.style.transform = `translateZ(${-m * g.drumR}px)`;

    const scale = lerp(g.ringScale, 1, m);
    for (let i = 0; i < count; i++) {
      const d = i - pos;
      const c = cards[i];
      c.style.transform = place(d * (360 / count), d * STEP, g, m, scale);
      // Culled by distance, not angle: a full turn brings the far side back
      // round to face us, stacked on the vanishing point.
      c.style.opacity = m > 0.5 && Math.abs(d) > CULL ? "0" : "1";
      c.style.zIndex = String(Math.round(100 - Math.abs(d) * 2));
    }
    if (label) label.style.opacity = String(1 - m);
    if (title) title.style.opacity = String(m);
    setActive(clamp(Math.round(pos), 0, last));
  }

  function tick() {
    raf = 0;
    const gap = target - turn;
    if (Math.abs(gap) < 0.0005) turn = target;
    else turn += gap * EASE;
    draw();
    if (turn !== target) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", () => {
    target = targetFromScroll();
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  window.addEventListener("resize", layout);
  new ResizeObserver(layout).observe(stage);
  layout();
})();
