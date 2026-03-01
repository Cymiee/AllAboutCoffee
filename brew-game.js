// brew-game.js

// ─── Data ───────────────────────────────────────────────────────────────────

const INGREDIENTS = [
  { key: "espresso",   label: "Espresso"     },
  { key: "water",      label: "Hot Water"    },
  { key: "milk",       label: "Steamed Milk" },
  { key: "foam",       label: "Milk Foam"    },
  { key: "chocolate",  label: "Chocolate"    },
  { key: "cream",      label: "Cream"        },
];

// Order layers are stacked inside the cup (bottom → top)
const LAYER_ORDER = ["espresso", "water", "chocolate", "milk", "cream", "foam"];

// Matches the --lc CSS custom properties in brew.html
const LAYER_COLORS = {
  espresso:  "#7B3520",
  water:     "#7B9FB8",
  chocolate: "#5C3317",
  milk:      "#DEBBA0",
  cream:     "#E8C87A",
  foam:      "#D6C9BB",
};

const state = Object.fromEntries(INGREDIENTS.map(i => [i.key, 0]));

// ─── Utilities ───────────────────────────────────────────────────────────────

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// ─── Cup visualisation ───────────────────────────────────────────────────────

const MAX_PARTS = 10; // parts to fill the cup

function updateCup() {
  const total     = Object.values(state).reduce((a, b) => a + b, 0);
  const fillLevel = Math.min(total / MAX_PARTS, 1);

  let bottomPct = 0;
  LAYER_ORDER.forEach(key => {
    const el = document.getElementById(`layer-${key}`);
    if (!el) return;
    const fraction  = total > 0 ? state[key] / total : 0;
    const heightPct = fraction * fillLevel * 100;
    el.style.bottom = `${bottomPct}%`;
    el.style.height = `${heightPct}%`;
    bottomPct += heightPct;
  });

  const steam = document.getElementById("cupSteam");
  if (steam) steam.classList.toggle("is-active", total > 0);

  updateLegend(total);
}

function updateLegend(total) {
  const legend = document.getElementById("cupLegend");
  if (!legend) return;

  const active = LAYER_ORDER.filter(k => state[k] > 0);
  if (!active.length) { legend.innerHTML = ""; return; }

  const ingMap = Object.fromEntries(INGREDIENTS.map(i => [i.key, i]));
  legend.innerHTML = active
    .map(k => `
      <span class="cup-legend-item">
        <span class="cup-legend-dot" style="background:${LAYER_COLORS[k]}"></span>
        ${ingMap[k].label} ×${state[k]}
      </span>`)
    .join("");
}

// ─── Ingredient cards ────────────────────────────────────────────────────────

function renderControls() {
  const root = document.getElementById("controls");
  if (!root) return;
  root.innerHTML = "";

  INGREDIENTS.forEach(({ key, label, icon }) => {
    const card = document.createElement("div");
    card.className = "brew-ing-card";
    card.id        = `ing-${key}`;
    card.innerHTML = `
      <span class="brew-ing-name">${label}</span>
      <span class="brew-ing-count" id="count-${key}">0</span>
      <div class="brew-steppers">
        <button class="brew-step" type="button"
                data-key="${key}" data-delta="-1"
                aria-label="Remove ${label}" disabled>−</button>
        <button class="brew-step" type="button"
                data-key="${key}" data-delta="1"
                aria-label="Add ${label}">+</button>
      </div>`;
    root.appendChild(card);
  });
}

// Update a single card without re-rendering the whole grid
function updateCard(key) {
  const card    = document.getElementById(`ing-${key}`);
  const countEl = document.getElementById(`count-${key}`);
  if (!card || !countEl) return;

  const v = state[key];
  countEl.textContent = v;
  card.classList.toggle("has-value", v > 0);

  const minus = card.querySelector('[data-delta="-1"]');
  const plus  = card.querySelector('[data-delta="1"]');
  if (minus) minus.disabled = v === 0;
  if (plus)  plus.disabled  = v >= 10;
}

// Single delegated listener — survives future re-renders
function initSteppers() {
  const root = document.getElementById("controls");
  if (!root) return;

  root.addEventListener("click", e => {
    const btn = e.target.closest(".brew-step");
    if (!btn || btn.disabled) return;

    const key   = btn.dataset.key;
    const delta = parseInt(btn.dataset.delta, 10);
    if (!key || isNaN(delta)) return;

    state[key] = clamp(state[key] + delta, 0, 10);
    updateCard(key);
    updateCup();
    updateMix();
    setResult(identifyDrink());
  });
}

// ─── Mix summary ─────────────────────────────────────────────────────────────

function updateMix() {
  const el = document.getElementById("mixSummary");
  if (!el) return;

  const ingMap = Object.fromEntries(INGREDIENTS.map(i => [i.key, i]));
  const active = Object.entries(state).filter(([, v]) => v > 0);
  el.innerHTML = active
    .map(([k, v]) =>
      `<span class="brew-mix-tag">${ingMap[k].label} ×${v}</span>`)
    .join("");
}

// ─── Core classification ─────────────────────────────────────────────────────

function similarity(input, target) {
  const keys  = Object.keys(target);
  const sumIn = keys.reduce((acc, k) => acc + (input[k] || 0), 0);
  const sumT  = keys.reduce((acc, k) => acc + (target[k] || 0), 0);

  const inNorm = {};
  const tNorm  = {};
  keys.forEach(k => {
    inNorm[k] = sumIn ? (input[k] || 0) / sumIn : 0;
    tNorm[k]  = sumT  ? (target[k] || 0) / sumT  : 0;
  });

  let dist = 0;
  keys.forEach(k => dist += Math.abs(inNorm[k] - tNorm[k]));
  return clamp(1 - dist / 1.4, 0, 1);
}

function makeTip(input, name) {
  const { water: w, milk: m, foam: f, chocolate: c } = input;
  if (name === "Latte"       && f > m)   return "Tip: less foam makes it more latte-like.";
  if (name === "Cappuccino"  && m > f)   return "Tip: more foam pushes it toward a cappuccino.";
  if (name === "Americano"   && w < 2)   return "Tip: add more water for a classic americano.";
  if (name === "Mocha"       && c === 0) return "Tip: add chocolate to push it into mocha territory.";
  return "";
}

function identifyDrink() {
  const input = { ...state };
  const total = Object.values(input).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return { name: "—", desc: "Build a drink using the ingredient cards.", confidence: 0 };
  }
  if (input.espresso === 0) {
    return {
      name: "Not espresso-based",
      desc: "Most café classics start with espresso. Add at least one shot.",
      confidence: 20,
    };
  }

  const recipes = [
    { name: "Espresso",
      desc: "Just espresso — concentrated and intense.",
      target: { espresso:1, water:0, milk:0, foam:0, chocolate:0, cream:0 } },
    { name: "Americano",
      desc: "Espresso + hot water — lighter body, same espresso character.",
      target: { espresso:1, water:3, milk:0, foam:0, chocolate:0, cream:0 } },
    { name: "Latte",
      desc: "Espresso with lots of steamed milk and a thin foam cap.",
      target: { espresso:1, water:0, milk:4, foam:1, chocolate:0, cream:0 } },
    { name: "Cappuccino",
      desc: "Equal thirds — espresso, steamed milk, and thick milk foam.",
      target: { espresso:1, water:0, milk:2, foam:2, chocolate:0, cream:0 } },
    { name: "Flat White",
      desc: "Espresso-forward milk drink — velvety, almost no foam.",
      target: { espresso:1, water:0, milk:3, foam:0, chocolate:0, cream:0 } },
    { name: "Cortado",
      desc: "Balanced and small — roughly equal espresso and milk.",
      target: { espresso:1, water:0, milk:1, foam:0, chocolate:0, cream:0 } },
    { name: "Mocha",
      desc: "A latte with chocolate — espresso, milk, and cocoa richness.",
      target: { espresso:1, water:0, milk:3, foam:1, chocolate:1, cream:0 } },
    { name: "Breve Latte",
      desc: "Latte-like but with cream — richer and denser.",
      target: { espresso:1, water:0, milk:2, foam:1, chocolate:0, cream:2 } },
  ];

  const scored = recipes
    .map(r => ({ ...r, score: similarity(input, r.target) }))
    .sort((a, b) => b.score - a.score);

  const best       = scored[0];
  const confidence = Math.round(best.score * 100);
  const tip        = makeTip(input, best.name);

  return {
    name: best.name,
    desc: best.desc + (tip ? ` ${tip}` : ""),
    confidence,
  };
}

// ─── Result display ──────────────────────────────────────────────────────────

const RING_C = 238.76; // 2π × r=38

function setResult(r) {
  const nameEl = document.getElementById("drinkName");
  const descEl = document.getElementById("drinkDesc");
  const arcEl  = document.getElementById("ringArc");
  const pctEl  = document.getElementById("confidencePct");

  if (nameEl) nameEl.textContent = r.name;
  if (descEl) descEl.textContent = r.desc;

  const conf = clamp(r.confidence, 0, 100);

  if (arcEl) {
    arcEl.style.strokeDashoffset = `${RING_C * (1 - conf / 100)}`;
    arcEl.style.stroke =
      conf >= 70 ? "var(--accent)" :
      conf >= 40 ? "#B8860B"       :
                   "rgba(31,26,22,0.30)";
  }

  if (pctEl) pctEl.textContent = conf > 0 ? `${conf}%` : "—";
}

// ─── Reset ───────────────────────────────────────────────────────────────────

function reset() {
  Object.keys(state).forEach(k => { state[k] = 0; updateCard(k); });
  updateCup();
  updateMix();
  setResult({ name: "—", desc: "Build a drink using the ingredient cards.", confidence: 0 });
}

// ─── Boot ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  renderControls();
  initSteppers();
  setResult({ name: "—", desc: "Build a drink using the ingredient cards.", confidence: 0 });

  document.getElementById("btnIdentify")
    ?.addEventListener("click", () => setResult(identifyDrink()));

  document.getElementById("btnReset")
    ?.addEventListener("click", reset);
});
