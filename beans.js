/**
 * beans.js
 * --------
 * Coffee beans that fall as you scroll. One fixed canvas sits behind all
 * page content (z-index -1, no pointer events), so beans pass behind text
 * and are hidden by opaque surfaces like cards and the portal.
 *
 * Motion is driven by scroll, not a clock: scrolling down makes beans fall,
 * scrolling up makes them rise. Their position eases toward the scroll
 * position, so they glide to a stop instead of freezing, and nothing
 * animates (or costs battery) while the page is still.
 *
 * Purely decorative: skipped entirely under prefers-reduced-motion.
 */
(() => {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "bean-rain";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const MARGIN = 48;         // beans wrap from just below to just above
  const EASE = 0.12;         // how quickly beans catch up with the scroll

  // One pre-rendered bean, drawn scaled and rotated for every instance.
  const SPRITE = 96;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE;
  (() => {
    const s = sprite.getContext("2d");
    s.translate(SPRITE / 2, SPRITE / 2);
    const body = s.createRadialGradient(-12, -11, 3, 0, 0, 42);
    body.addColorStop(0, "#E2AA66");      // lit shoulder, in the gold family
    body.addColorStop(0.45, "#9A5A26");
    body.addColorStop(1, "#3A200C");
    s.fillStyle = body;
    s.beginPath();
    s.ellipse(0, 0, 40, 29, 0, 0, Math.PI * 2);
    s.fill();
    // the centre crease
    s.strokeStyle = "#241205";
    s.lineWidth = 5;
    s.lineCap = "round";
    s.beginPath();
    s.moveTo(-30, 7);
    s.bezierCurveTo(-10, -12, 10, 14, 30, -7);
    s.stroke();
  })();

  let W = 0, H = 0, beans = [];
  let current = window.scrollY, raf = 0;

  // Mostly in the outer margins, so beans stay out of the reading column.
  const pickX = () => {
    const r = Math.random();
    if (r < 0.38) return Math.random() * 0.26;
    if (r < 0.76) return 0.74 + Math.random() * 0.26;
    return 0.26 + Math.random() * 0.48;
  };

  function seed() {
    const count = Math.round(Math.min(20, Math.max(8, (W * H) / 60000)));
    beans = Array.from({ length: count }, () => {
      const depth = Math.random();          // 0 = far, 1 = near
      return {
        x: pickX(),                         // fraction of width
        y: Math.random(),                   // fraction of the wrap span
        depth,
        size: 10 + depth * 17,
        speed: 0.18 + depth * 0.62,         // px of fall per px of scroll
        alpha: 0.16 + depth * 0.34,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.004,
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      };
    }).sort((a, b) => a.depth - b.depth);   // far beans draw first
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const first = !W;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first) seed();
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const span = H + MARGIN * 2;
    for (const b of beans) {
      const fall = b.y * span + current * b.speed;
      const y = ((fall % span) + span) % span - MARGIN;
      const x = b.x * W + Math.sin(current * 0.002 + b.phase) * b.sway;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(x, y);
      ctx.rotate(b.rot + current * b.spin);
      ctx.drawImage(sprite, -b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    }
  }

  function tick() {
    raf = 0;
    const target = window.scrollY;
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.3) current = target;
    draw();
    if (current !== target) raf = requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", () => {
    if (!raf && !document.hidden) raf = requestAnimationFrame(tick);
  }, { passive: true });
  window.addEventListener("resize", resize);
  resize();
})();
