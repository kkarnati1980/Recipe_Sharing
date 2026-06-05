// history.js — session history + business analytics

import { RECIPES } from './data.js';

const HISTORY_KEY = 'cc.history.v1';

export function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; }
}
export function writeHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { /* ignore */ }
}

export function startRun(recipe, personaId) {
  return {
    id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    recipeId: recipe.id,
    recipeName: recipe.name,
    emoji: recipe.emoji,
    persona: personaId,
    started: Date.now(),
    finished: null,
    completed: false,
    durationMs: 0,
    stepsTotal: recipe.steps.length,
    stepsReached: 0,
    serves: recipe.serves || 1,
    ingredients: (recipe.ingredients || []).map(i => ({ item: i.item, qty: i.qty, unit: i.unit })),
    nutrition: recipe.nutrition || null,
    actions: [],       // {kind:'next|repeat|skip|back|goto|tip|substitute|share', t, meta?}
    conversation: [],  // {role:'system'|'user', text, t}
  };
}

export function appendAction(run, kind, meta) {
  run.actions.push({ kind, t: Date.now(), ...(meta ? { meta } : {}) });
}
export function appendTurn(run, role, text) {
  run.conversation.push({ role, text, t: Date.now() });
}

// ── analytics computations ─────────────────────────────────────────
export function bucketStart(d, granularity) {
  const t = new Date(d);
  if (granularity === 'day') { t.setHours(0, 0, 0, 0); }
  else if (granularity === 'week') {
    const day = t.getDay(); const diff = (day === 0 ? -6 : 1 - day);
    t.setDate(t.getDate() + diff); t.setHours(0, 0, 0, 0);
  }
  else if (granularity === 'month') { t.setDate(1); t.setHours(0, 0, 0, 0); }
  return t.getTime();
}
export function formatBucket(ms, granularity) {
  const d = new Date(ms);
  if (granularity === 'day') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (granularity === 'week') { const e = new Date(ms + 6 * 86400000); return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}–${e.toLocaleDateString(undefined, { day: 'numeric' })}`; }
  if (granularity === 'month') return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  return d.toISOString().slice(0, 10);
}

export function fmtQty(q) {
  if (q == null) return '';
  // round to up to 2 decimals, strip trailing zeros
  const r = Math.round(q * 100) / 100;
  return (Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
}

export function analyse(history, opts) {
  const { from, to, granularity = 'day' } = opts || {};
  const inRange = history.filter(r => (!from || r.started >= from) && (!to || r.started <= to));
  const completed = inRange.filter(r => r.completed);
  // total heads served across completed runs (for per-head averages)
  const totalHeads = completed.reduce((s, r) => s + (r.serves || 1), 0);
  const totals = {
    runs: inRange.length,
    completed: completed.length,
    completionRate: inRange.length ? Math.round(100 * completed.length / inRange.length) : 0,
    totalCookMinutes: Math.round(inRange.reduce((s, r) => s + (r.durationMs || 0), 0) / 60000),
    // total dish calories cooked = per-unit cal × units/head × heads
    totalCalories: completed.reduce((s, r) => {
      const n = r.nutrition; if (!n) return s;
      const su = n.servingUnits || 1; const serves = r.serves || 1;
      return s + (n.calories || 0) * su * serves;
    }, 0),
    heads: totalHeads,
    actions: inRange.reduce((s, r) => s + (r.actions?.length || 0), 0),
  };
  // breakdowns
  const byRecipe = {};
  const byPersona = {};
  const byAction = {};
  // ingredient consumption: { item: { units:{[unit]:totalQty}, runs:count, heads:count, qualitative:Set<string> } }
  const ingMap = {};
  // nutrition per head accumulator (sum of per-head macros over completed runs that have nutrition)
  const nutAcc = { calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0, complex_g: 0, sugar_g: 0, fiber_g: 0 };
  let nutRuns = 0;
  inRange.forEach(r => {
    byRecipe[r.recipeName] = (byRecipe[r.recipeName] || 0) + 1;
    byPersona[r.persona] = (byPersona[r.persona] || 0) + 1;
    (r.actions || []).forEach(a => { byAction[a.kind] = (byAction[a.kind] || 0) + 1; });
    if (r.completed) {
      const serves = r.serves || 1;
      (r.ingredients || []).forEach(i => {
        if (!ingMap[i.item]) ingMap[i.item] = { item: i.item, units: {}, runs: 0, heads: 0, qualitative: new Set() };
        ingMap[i.item].runs += 1;
        ingMap[i.item].heads += serves;
        if (typeof i.qty === 'number' && i.qty > 0) {
          const u = (i.unit || 'unit').trim();
          ingMap[i.item].units[u] = (ingMap[i.item].units[u] || 0) + i.qty;
        } else if (i.unit) {
          ingMap[i.item].qualitative.add(i.unit);
        }
      });
      // per-head nutrition for this run = per-unit macro × units/head
      const n = r.nutrition;
      if (n) {
        const su = n.servingUnits || 1;
        nutAcc.calories += (n.calories || 0) * su;
        nutAcc.protein_g += (n.protein_g || 0) * su;
        nutAcc.fat_g += (n.fat_g || 0) * su;
        nutAcc.carbs_g += (n.carbs_g || 0) * su;
        nutAcc.complex_g += ((n.carbs && n.carbs.complex_g) || 0) * su;
        nutAcc.sugar_g += ((n.carbs && n.carbs.sugar_g) || 0) * su;
        nutAcc.fiber_g += ((n.carbs && n.carbs.fiber_g) || 0) * su;
        nutRuns += 1;
      }
    }
  });
  // average nutrition per head (per person, per dish) across completed runs
  const nutritionPerHead = nutRuns ? {
    basisRuns: nutRuns,
    calories: Math.round(nutAcc.calories / nutRuns),
    protein_g: Math.round(nutAcc.protein_g / nutRuns * 10) / 10,
    fat_g: Math.round(nutAcc.fat_g / nutRuns * 10) / 10,
    carbs_g: Math.round(nutAcc.carbs_g / nutRuns * 10) / 10,
    complex_g: Math.round(nutAcc.complex_g / nutRuns * 10) / 10,
    sugar_g: Math.round(nutAcc.sugar_g / nutRuns * 10) / 10,
    fiber_g: Math.round(nutAcc.fiber_g / nutRuns * 10) / 10,
  } : null;
  // shape ingredient consumption with a display string + primary qty for sorting + per-head average
  const ingredientConsumption = Object.values(ingMap).map(ing => {
    const unitEntries = Object.entries(ing.units).sort((a, b) => b[1] - a[1]);
    const primary = unitEntries[0] || null;
    const extras = unitEntries.slice(1);
    let display = '';
    let perHeadDisplay = '';
    if (primary) {
      display = `${fmtQty(primary[1])} ${primary[0]}`;
      if (extras.length) display += extras.map(([u, q]) => ` + ${fmtQty(q)} ${u}`).join('');
      const ph = ing.heads ? primary[1] / ing.heads : 0;
      perHeadDisplay = `${fmtQty(ph)} ${primary[0]}/head`;
    } else if (ing.qualitative.size) {
      display = [...ing.qualitative].join(' / ');
      perHeadDisplay = display;
    } else {
      display = '—';
    }
    return { item: ing.item, runs: ing.runs, heads: ing.heads, display, perHeadDisplay, primaryQty: primary ? primary[1] : 0 };
  }).sort((a, b) => {
    // sort primarily by numeric consumption desc, falling back to runs count
    if (b.primaryQty !== a.primaryQty) return b.primaryQty - a.primaryQty;
    return b.runs - a.runs;
  });
  const toSorted = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  // time series buckets
  const seriesMap = {};
  inRange.forEach(r => {
    const b = bucketStart(r.started, granularity);
    seriesMap[b] = (seriesMap[b] || 0) + 1;
  });
  let series = Object.entries(seriesMap).sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ bucket: +k, label: formatBucket(+k, granularity), count: v }));
  // pad series with zeroes between min and max if range is small
  if (series.length > 1) {
    const step = granularity === 'day' ? 86400000 : granularity === 'week' ? 7 * 86400000 : null;
    if (step) {
      const out = []; let cur = series[0].bucket; const end = series[series.length - 1].bucket;
      while (cur <= end) {
        const found = series.find(x => x.bucket === cur);
        out.push(found || { bucket: cur, label: formatBucket(cur, granularity), count: 0 });
        cur += step;
      }
      series = out;
    }
  }
  return { totals, byRecipe: toSorted(byRecipe), ingredientConsumption, nutritionPerHead, byPersona: toSorted(byPersona), byAction: toSorted(byAction), series };
}

// ── seed some demo history so analytics aren't empty on first open ─
export function ensureSeedHistory() {
  if (readHistory().length) return;
  const now = Date.now();
  const day = 86400000;
  const seed = [
    { rid: 'dosa',   off: 14 * day, dur: 35 * 60000, completed: true,  steps: 5, actions: ['next', 'next', 'repeat', 'next', 'next'] },
    { rid: 'pongal', off: 10 * day, dur: 42 * 60000, completed: true,  steps: 5, actions: ['next', 'tip', 'next', 'next', 'next', 'next'] },
    { rid: 'dosa',   off:  8 * day, dur: 28 * 60000, completed: true,  steps: 5, actions: ['skip', 'next', 'next', 'next', 'next'] },
    { rid: 'idli',   off:  6 * day, dur: 18 * 60000, completed: true,  steps: 5, actions: ['next', 'next', 'next', 'next', 'next'] },
    { rid: 'dosa',   off:  4 * day, dur: 32 * 60000, completed: true,  steps: 5, actions: ['next', 'repeat', 'next', 'goto', 'next'] },
    { rid: 'pongal', off:  2 * day, dur: 12 * 60000, completed: false, steps: 5, reached: 2, actions: ['next', 'tip', 'back'] },
    { rid: 'idli',   off:  1 * day, dur: 22 * 60000, completed: true,  steps: 5, actions: ['next', 'next', 'substitute', 'next', 'next'] },
  ];
  const out = seed.map(s => {
    const rec = RECIPES[s.rid];
    if (!rec) return null;
    const started = now - s.off;
    const finished = started + s.dur;
    return {
      id: 'seed_' + s.rid + '_' + s.off,
      recipeId: s.rid, recipeName: rec.name, emoji: rec.emoji,
      persona: ['amma', 'chef', 'friend'][Math.floor(Math.random() * 3)],
      started, finished, completed: s.completed,
      durationMs: s.dur,
      stepsTotal: s.steps, stepsReached: s.completed ? s.steps : (s.reached || 1),
      serves: rec.serves || 4,
      ingredients: (rec.ingredients || []).map(i => ({ item: i.item, qty: i.qty, unit: i.unit })),
      nutrition: rec.nutrition || null,
      actions: s.actions.map((kind, i) => ({ kind, t: started + i * 60000 })),
      conversation: [],
      isSeed: true,
    };
  }).filter(Boolean);
  writeHistory(out);
}
