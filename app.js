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

function renderControls(){
  const root = document.getElementById("controls");
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

    const minus = pill("−", () => { state[key] = clamp(state[key] - 1, 0, 10); renderControls(); });
    const plus  = pill("+", () => { state[key] = clamp(state[key] + 1, 0, 10); renderControls(); });

    pills.appendChild(minus);
    pills.appendChild(plus);

    wrap.appendChild(left);
    wrap.appendChild(pills);
    root.appendChild(wrap);
  });

  updateSummary();
}

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

function identifyDrink(){
  const e = state.espresso;
  const w = state.water;
  const m = state.milk;
  const f = state.foam;
  const c = state.chocolate;
  const cr = state.cream;

  // Helper totals
  const milkTotal = m + f;
  const total = e + w + milkTotal + c + cr;

  // Basic sanity
  if (total === 0) return result("Nothing", "Add ingredients to make a drink.", 0);

  // If no espresso, we can't classify well (for now)
  if (e === 0) {
    return result(
      "Not espresso-based",
      "Most café classics start with espresso. Add at least 1 espresso shot.",
      25
    );
  }

  // Recipe templates (parts-based). We score by closeness.
  // Each recipe defines expected ratios (relative), not absolute.
  const recipes = [
    // Pure / water-based
    { name: "Espresso", desc: "Just espresso — concentrated and intense.", target: { espresso: 1, water: 0, milk: 0, foam: 0, chocolate: 0, cream: 0 } },
    { name: "Americano", desc: "Espresso + hot water — lighter body than espresso.", target: { espresso: 1, water: 3, milk: 0, foam: 0, chocolate: 0, cream: 0 } },

    // Milk classics
    { name: "Latte", desc: "Espresso + lots of steamed milk + a thin foam cap.", target: { espresso: 1, water: 0, milk: 4, foam: 1, chocolate: 0, cream: 0 } },
    { name: "Cappuccino", desc: "Espresso + milk + more foam (airier).", target: { espresso: 1, water: 0, milk: 2, foam: 2, chocolate: 0, cream: 0 } },
    { name: "Flat White", desc: "Espresso-forward milk drink with very little foam.", target: { espresso: 1, water: 0, milk: 3, foam: 0, chocolate: 0, cream: 0 } },
    { name: "Cortado", desc: "Equal-ish espresso and milk. Small, balanced.", target: { espresso: 1, water: 0, milk: 1, foam: 0, chocolate: 0, cream: 0 } },

    // Flavored
    { name: "Mocha", desc: "Latte + chocolate.", target: { espresso: 1, water: 0, milk: 3, foam: 1, chocolate: 1, cream: 0 } },

    // Creamy variations
    { name: "Breve Latte", desc: "Latte-like, but with cream for richer texture.", target: { espresso: 1, water: 0, milk: 2, foam: 1, chocolate: 0, cream: 2 } },
  ];

  const input = { espresso: e, water: w, milk: m, foam: f, chocolate: c, cream: cr };

  // Normalize both input and targets by their total to compare ratios.
  const scored = recipes.map(r => {
    const s = similarity(input, r.target);
    return { ...r, score: s };
  }).sort((a,b) => b.score - a.score);

  // Heuristic override: very water-heavy → Americano vibe
  // but keep it soft.
  let best = scored[0];

  const confidence = Math.round(best.score * 100);
  const extraTip = makeTip(input, best.name);

  return result(best.name, best.desc + (extraTip ? ` ${extraTip}` : ""), confidence);
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

  // distance in ratio space
  let dist = 0;
  keys.forEach(k => dist += Math.abs(inNorm[k] - tNorm[k]));

  // Convert to similarity (0..1). Lower dist => higher similarity.
  // Max possible L1 dist here is ~2.
  const sim = clamp(1 - dist / 1.4, 0, 1); // 1.4 makes it feel less harsh
  return sim;
}

function makeTip(input, name){
  const { espresso:e, water:w, milk:m, foam:f, chocolate:c, cream:cr } = input;

  if (name === "Latte" && f > m) return "Tip: less foam makes it more latte-like.";
  if (name === "Cappuccino" && m > f) return "Tip: more foam pushes it toward cappuccino.";
  if (name === "Americano" && w < 2) return "Tip: add more water for a classic americano feel.";
  if (name === "Espresso" && (m+w+f+c+cr) > 0) return "Tip: remove extras to keep it a pure espresso.";
  if (name === "Mocha" && c === 0) return "Tip: add chocolate to make it a mocha.";
  return "";
}

function result(name, desc, confidence){
  return { name, desc, confidence };
}

function setResult(r){
  document.getElementById("drinkName").textContent = r.name;
  document.getElementById("drinkDesc").textContent = r.desc;

  const bar = document.getElementById("confidenceBar");
  bar.style.width = `${clamp(r.confidence, 0, 100)}%`;
}

function reset(){
  Object.keys(state).forEach(k => state[k] = 0);
  renderControls();
  setResult(result("—", "Build a drink, then click identify.", 0));
}

document.addEventListener("DOMContentLoaded", () => {
  renderControls();

  document.getElementById("btnIdentify").addEventListener("click", () => {
    setResult(identifyDrink());
  });

  document.getElementById("btnReset").addEventListener("click", reset);
});