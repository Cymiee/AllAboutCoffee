// brew-game.js

const INGREDIENTS = [
  { key: "espresso", label: "Espresso shots" },
  { key: "water", label: "Hot water" },
  { key: "milk", label: "Steamed milk" },
  { key: "foam", label: "Milk foam" },
  { key: "chocolate", label: "Chocolate" },
  { key: "cream", label: "Cream" },
];

const state = Object.fromEntries(INGREDIENTS.map(i => [i.key, 0]));

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function pill(text, onClick){
  const b = document.createElement("button");
  b.className = "pill";
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function updateSummary(){
  const parts = Object.entries(state)
    .filter(([,v]) => v > 0)
    .map(([k,v]) => `${k}: ${v}`)
    .join(", ") || "—";
  document.getElementById("mixSummary").textContent = parts;
}

function renderControls(){
  const root = document.getElementById("controls");
  if (!root) return;

  root.innerHTML = "";

  INGREDIENTS.forEach(({key, label}) => {
    const wrap = document.createElement("div");
    wrap.className = "control";

    const left = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = label;

    const sub = document.createElement("div");
    sub.style.color = "rgba(31,26,22,0.72)";
    sub.style.fontSize = "0.95rem";
    sub.textContent = `Amount: ${state[key]} part(s)`;

    left.appendChild(title);
    left.appendChild(sub);

    const pills = document.createElement("div");
    pills.className = "pills";

    const minus = pill("−", () => {
      state[key] = clamp(state[key] - 1, 0, 10);
      renderControls();
    });

    const plus = pill("+", () => {
      state[key] = clamp(state[key] + 1, 0, 10);
      renderControls();
    });

    pills.appendChild(minus);
    pills.appendChild(plus);

    wrap.appendChild(left);
    wrap.appendChild(pills);
    root.appendChild(wrap);
  });

  updateSummary();
}

function similarity(input, target){
  const keys = Object.keys(target);

  const sumIn = keys.reduce((acc,k) => acc + (input[k] || 0), 0);
  const sumT  = keys.reduce((acc,k) => acc + (target[k] || 0), 0);

  const inNorm = {};
  const tNorm = {};
  keys.forEach(k => {
    inNorm[k] = sumIn ? (input[k] || 0) / sumIn : 0;
    tNorm[k]  = sumT  ? (target[k] || 0) / sumT : 0;
  });

  let dist = 0;
  keys.forEach(k => dist += Math.abs(inNorm[k] - tNorm[k]));

  // distance -> similarity (0..1)
  return clamp(1 - dist / 1.4, 0, 1);
}

function makeTip(input, name){
  const { water:w, milk:m, foam:f, chocolate:c } = input;

  if (name === "Latte" && f > m) return "Tip: less foam makes it more latte-like.";
  if (name === "Cappuccino" && m > f) return "Tip: more foam pushes it toward cappuccino.";
  if (name === "Americano" && w < 2) return "Tip: add more water for a classic americano feel.";
  if (name === "Mocha" && c === 0) return "Tip: add chocolate to make it a mocha.";
  return "";
}

function identifyDrink(){
  const input = { ...state };
  const e = input.espresso;

  const total = Object.values(input).reduce((a,b) => a + b, 0);
  if (total === 0) {
    return { name: "Nothing yet", desc: "Add ingredients to make a drink.", confidence: 0 };
  }

  if (e === 0) {
    return {
      name: "Not espresso-based",
      desc: "Most café classics start with espresso. Add at least 1 espresso shot.",
      confidence: 25
    };
  }

  const recipes = [
    { name: "Espresso", desc: "Just espresso — concentrated and intense.",
      target: { espresso: 1, water: 0, milk: 0, foam: 0, chocolate: 0, cream: 0 } },

    { name: "Americano", desc: "Espresso + hot water — lighter body than espresso.",
      target: { espresso: 1, water: 3, milk: 0, foam: 0, chocolate: 0, cream: 0 } },

    { name: "Latte", desc: "Espresso + lots of steamed milk + a thin foam cap.",
      target: { espresso: 1, water: 0, milk: 4, foam: 1, chocolate: 0, cream: 0 } },

    { name: "Cappuccino", desc: "Espresso + milk + more foam (airier texture).",
      target: { espresso: 1, water: 0, milk: 2, foam: 2, chocolate: 0, cream: 0 } },

    { name: "Flat White", desc: "Espresso-forward milk drink with very little foam.",
      target: { espresso: 1, water: 0, milk: 3, foam: 0, chocolate: 0, cream: 0 } },

    { name: "Cortado", desc: "Small and balanced — roughly equal espresso and milk.",
      target: { espresso: 1, water: 0, milk: 1, foam: 0, chocolate: 0, cream: 0 } },

    { name: "Mocha", desc: "Latte + chocolate.",
      target: { espresso: 1, water: 0, milk: 3, foam: 1, chocolate: 1, cream: 0 } },

    { name: "Breve Latte", desc: "Latte-like, but cream makes it richer.",
      target: { espresso: 1, water: 0, milk: 2, foam: 1, chocolate: 0, cream: 2 } },
  ];

  const scored = recipes
    .map(r => ({ ...r, score: similarity(input, r.target) }))
    .sort((a,b) => b.score - a.score);

  const best = scored[0];
  const confidence = Math.round(best.score * 100);
  const tip = makeTip(input, best.name);

  return {
    name: best.name,
    desc: best.desc + (tip ? ` ${tip}` : ""),
    confidence
  };
}

function setResult(r){
  const nameEl = document.getElementById("drinkName");
  const descEl = document.getElementById("drinkDesc");
  const bar = document.getElementById("confidenceBar");

  if (nameEl) nameEl.textContent = r.name;
  if (descEl) descEl.textContent = r.desc;
  if (bar) bar.style.width = `${clamp(r.confidence, 0, 100)}%`;

  updateSummary();
}

function reset(){
  Object.keys(state).forEach(k => state[k] = 0);
  renderControls();
  setResult({ name: "—", desc: "Build a drink, then click identify.", confidence: 0 });
}

document.addEventListener("DOMContentLoaded", () => {
  renderControls();
  setResult({ name: "—", desc: "Build a drink, then click identify.", confidence: 0 });

  const btnIdentify = document.getElementById("btnIdentify");
  const btnReset = document.getElementById("btnReset");

  if (btnIdentify) btnIdentify.addEventListener("click", () => setResult(identifyDrink()));
  if (btnReset) btnReset.addEventListener("click", reset);
});