// App.jsx — CookCircle interactive app
import React, { useState, useEffect, useRef } from 'react';

import { alpha, theme, FONT } from './theme.js';
import { RECIPES, RECENT, PERSONAS, detectIntent, shareText, deriveStepTags } from './data.js';
import {
  readHistory, writeHistory, startRun, appendAction,
  ensureSeedHistory,
} from './history.js';
import { IOSDevice } from './components/iosframe.jsx';
import { WaveBars, SpeakerRings } from './components/voice.jsx';
import { Profile, RunDetail } from './components/profile.jsx';
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio,
  TweakToggle, TweakColor, TweakSelect,
} from './components/tweaks.jsx';
import { getCapabilities, synthesize, transcribe } from './voiceService.js';

/* ── status line ── */
function StatusLine({ vstate, T, primary, secondary, idleText }) {
  let content;
  if (vstate === 'listening') content = <span style={{ color: primary, display: 'flex', alignItems: 'center', gap: 8 }}><span className="cc-mic-dot" style={{ background: primary }} />Listening…</span>;
  else if (vstate === 'processing') content = <span style={{ color: T.dim, display: 'flex', alignItems: 'center', gap: 8 }}><span className="cc-spin" style={{ borderColor: alpha(secondary, .3), borderTopColor: secondary }} />Processing…</span>;
  else if (vstate === 'speaking') content = <span style={{ color: secondary, display: 'flex', alignItems: 'center', gap: 8 }}><span className="cc-bars"><i style={{ background: secondary }} /><i style={{ background: secondary }} /><i style={{ background: secondary }} /><i style={{ background: secondary }} /></span>Speaking…</span>;
  else if (vstate === 'text') content = <span style={{ color: primary, display: 'flex', alignItems: 'center', gap: 7 }}>⌨️ Typing…</span>;
  else content = <span style={{ color: T.faint }}>{idleText}</span>;
  return <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13.5, fontWeight: 500, letterSpacing: '.01em' }}>{content}</div>;
}

/* ── primary mic button ── */
function Mic({ size = 104, vstate, primary, onPrimary, onClick }) {
  const listening = vstate === 'listening';
  return (
    <button onClick={onClick} className={listening ? 'cc-pulse' : ''} style={{
      width: size, height: size, borderRadius: '50%', border: 'none', cursor: 'pointer',
      background: primary, color: onPrimary, fontSize: size * 0.4, display: 'grid', placeItems: 'center',
      boxShadow: `0 12px 30px ${alpha(primary, .4)}`, transition: 'transform .12s', position: 'relative',
      ['--cc-ring']: alpha(primary, .35),
    }} onMouseDown={e => e.currentTarget.style.transform = 'scale(.95)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>🎤</button>
  );
}

/* ── pill button ── */
function Btn({ children, kind = 'ghost', T, primary, onClick, disabled, style }) {
  const base = { border: '1px solid transparent', borderRadius: 12, padding: '12px 16px', fontFamily: FONT, fontWeight: 700, fontSize: 14.5, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, transition: '.15s', ...style };
  if (kind === 'primary') return <button disabled={disabled} onClick={onClick} style={{ ...base, background: primary, color: T.onPrimary }}>{children}</button>;
  if (kind === 'solid') return <button disabled={disabled} onClick={onClick} style={{ ...base, background: T.solidBg, color: T.solidText }}>{children}</button>;
  return <button disabled={disabled} onClick={onClick} style={{ ...base, background: T.ghostBg, borderColor: T.ghostBd, color: T.ghostText }}>{children}</button>;
}

/* ── HOME ── */
function Home({ T, primary, secondary, persona, vstate, input, setInput, onMic, onSearch, onRecent, onOpenPersona, onOpenAdd, onOpenProfile, recipes, recents, onFocus, onBlur }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48 }}>
        <button onClick={onOpenProfile} title="Profile & analytics" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontSize: 22, padding: 0, lineHeight: 1 }}>☰</button>
        <span style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 800, fontSize: 21, letterSpacing: '-.02em', color: T.text }}><span style={{ color: primary }}>Cook</span>Circle</span>
        <button onClick={onOpenPersona} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.chipBg, border: `1px solid ${T.chipBd}`, borderRadius: 100, padding: '5px 11px 5px 8px', cursor: 'pointer', color: primary, fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
          <span style={{ fontSize: 15 }}>{persona.emoji}</span>{persona.name}
        </button>
      </div>

      {/* hero mic */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: 8 }}>
        <Mic vstate={vstate} primary={primary} onPrimary={T.onPrimary} onClick={onMic} />
        <StatusLine vstate={vstate} T={T} primary={primary} secondary={secondary}
          idleText="Tap or say: “How to make dosa”" />
      </div>

      {/* text fallback */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={input} onFocus={onFocus} onBlur={onBlur}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
          placeholder="Type your recipe (e.g., dosa)"
          style={{ flex: 1, padding: '13px 15px', borderRadius: 13, border: `1px solid ${vstate === 'text' ? primary : T.surfaceBd}`, boxShadow: vstate === 'text' ? `0 0 0 3px ${alpha(primary, .18)}` : 'none', background: T.inputBg, color: T.inputText, fontFamily: FONT, fontSize: 15, outline: 'none', transition: '.15s' }} />
        <button onClick={onSearch} style={{ display: 'flex', alignItems: 'center', gap: 6, background: primary, color: T.onPrimary, border: 'none', borderRadius: 13, padding: '0 16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}><span style={{ fontSize: 16 }}>🔍</span> Search</button>
      </div>

      {/* recents */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint }}>Recent</div>
          <button onClick={onOpenAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: primary, fontFamily: FONT, fontWeight: 800, fontSize: 11.5, letterSpacing: '.06em' }}>+ ADD RECIPE</button>
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {recents.map(id => { const r = recipes[id]; if (!r) return null; return (
            <button key={id} onClick={() => onRecent(id)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: T.chipBg, border: `1px solid ${T.chipBd}`, borderRadius: 100, padding: '9px 15px', cursor: 'pointer', color: T.text, fontFamily: FONT, fontWeight: 600, fontSize: 14 }}>
              <span>{r.emoji}</span>{r.name}
            </button>
          ); })}
          <button onClick={onOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: `1px dashed ${alpha(primary, .55)}`, borderRadius: 100, padding: '9px 14px', cursor: 'pointer', color: primary, fontFamily: FONT, fontWeight: 700, fontSize: 14 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>New
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ADD RECIPE ── (with ingredients + nutrition) */
function AddRecipe({ T, primary, secondary, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍽');
  const [serves, setServes] = useState('');
  const [steps, setSteps] = useState(['']);
  const [tips, setTips] = useState(['']);
  const [ingredients, setIngredients] = useState([{ qty: '', unit: '', item: '', subs: '' }]);
  const [openSubs, setOpenSubs] = useState({});
  const [nut, setNut] = useState({ perQty: '', calories: '', protein: '', fat: '', carbs: '', complex: '', sugar: '', fiber: '' });
  const canSave = name.trim().length > 0 && steps.some(s => s.trim().length > 0);
  function upd(arr, setArr, i, v) { const c = [...arr]; c[i] = v; setArr(c); }
  function addRow(arr, setArr) { setArr([...arr, '']); }
  function delRow(arr, setArr, i) { const c = arr.filter((_, j) => j !== i); setArr(c.length ? c : ['']); }
  function updIng(i, key, v) { setIngredients(ingredients.map((r, j) => j === i ? { ...r, [key]: v } : r)); }
  function addIng() { setIngredients([...ingredients, { qty: '', unit: '', item: '', subs: '' }]); }
  function delIng(i) { const c = ingredients.filter((_, j) => j !== i); setIngredients(c.length ? c : [{ qty: '', unit: '', item: '', subs: '' }]); setOpenSubs(s => { const n = { ...s }; delete n[i]; return n; }); }
  function toggleSubs(i) { setOpenSubs(s => ({ ...s, [i]: !s[i] })); }
  function updN(k, v) { setNut(s => ({ ...s, [k]: v })); }
  function submit() {
    if (!canSave) return;
    const ings = ingredients.filter(r => r.item.trim()).map(r => {
      const subsArr = (r.subs || '').split('\n').map(x => x.trim()).filter(Boolean);
      const ing = {
        item: r.item.trim(),
        qty: r.qty.trim() === '' ? null : (parseFloat(r.qty) || r.qty.trim()),
        unit: r.unit.trim() || 'as needed',
      };
      if (subsArr.length) ing.subs = subsArr;
      return ing;
    });
    const cal = parseFloat(nut.calories);
    let nutritionOut = null;
    if (!isNaN(cal)) {
      const carbs = parseFloat(nut.carbs);
      nutritionOut = {
        perQty: nut.perQty.trim() || '1 serving',
        calories: cal,
        protein_g: parseFloat(nut.protein) || 0,
        fat_g: parseFloat(nut.fat) || 0,
        carbs_g: isNaN(carbs) ? 0 : carbs,
      };
      const cmplx = parseFloat(nut.complex), sug = parseFloat(nut.sugar), fib = parseFloat(nut.fiber);
      if (!isNaN(cmplx) || !isNaN(sug) || !isNaN(fib))
        nutritionOut.carbs = { complex_g: cmplx || 0, sugar_g: sug || 0, fiber_g: fib || 0 };
    }
    onSave({
      name: name.trim(), emoji: emoji.trim() || '🍽',
      serves: parseInt(serves, 10) || null,
      steps: steps.map(s => s.trim()).filter(Boolean),
      tips: tips.map(s => s.trim()).filter(Boolean),
      ingredients: ings,
      nutrition: nutritionOut,
    });
  }
  const inputStyle = { padding: '12px 14px', borderRadius: 13, border: `1px solid ${T.surfaceBd}`, background: T.inputBg, color: T.inputText, fontFamily: FONT, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'none' };
  const tinyInput = { ...inputStyle, padding: '10px 11px', fontSize: 14 };
  const labelStyle = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint };
  const grow = (v) => Math.max(1, Math.min(4, Math.ceil(v.length / 38) || 1));
  const rowBullet = (i, color, emojiBullet) => (
    <div style={{ width: 26, flex: 'none', color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, paddingTop: 14, textAlign: 'center' }}>{emojiBullet || String(i + 1).padStart(2, '0')}</div>
  );
  const deleteBtn = (onClick, disabled) => (
    !disabled ? (<button onClick={onClick} aria-label="Remove" style={{ width: 32, height: 42, flex: 'none', background: 'transparent', border: `1px solid ${T.surfaceBd}`, borderRadius: 10, cursor: 'pointer', color: T.dim, fontSize: 16, marginTop: 1 }}>×</button>) : null
  );
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 14.5, fontWeight: 600, fontFamily: FONT }}>Cancel</button>
        <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 17, color: T.text }}>Add a recipe</div>
        <button disabled={!canSave} onClick={submit} style={{ background: 'none', border: 'none', cursor: canSave ? 'pointer' : 'default', color: canSave ? primary : T.faint, fontSize: 14.5, fontWeight: 800, fontFamily: FONT, opacity: canSave ? 1 : .55 }}>Save</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 18px' }}>
        {/* identity */}
        <div style={{ ...labelStyle, margin: '10px 0 8px' }}>Recipe</div>
        <div style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
          <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🍽" maxLength={4}
            style={{ ...inputStyle, width: 60, flex: 'none', textAlign: 'center', fontSize: 24, padding: '8px 0' }} />
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Recipe name"
            style={{ ...inputStyle, flex: 1, fontWeight: 600 }} />
        </div>
        <div style={{ display: 'flex', gap: 9, marginBottom: 18, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.dim }}>Serves</span>
          <input value={serves} onChange={e => setServes(e.target.value.replace(/\D/g, ''))} placeholder="4" inputMode="numeric"
            style={{ ...tinyInput, width: 64, flex: 'none', textAlign: 'center' }} />
          <span style={{ fontSize: 12.5, color: T.faint }}>people</span>
        </div>
        {/* ingredients */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '14px 0 10px' }}>
          <div style={labelStyle}>Ingredients</div>
          <span style={{ fontSize: 11.5, color: T.faint }}>qty · unit · item</span>
        </div>
        {ingredients.map((row, i) => {
          const open = !!openSubs[i];
          return (
            <div key={'i' + i} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input value={row.qty} onChange={e => updIng(i, 'qty', e.target.value)} placeholder="1"
                  style={{ ...tinyInput, width: 48, flex: 'none', textAlign: 'center' }} />
                <input value={row.unit} onChange={e => updIng(i, 'unit', e.target.value)} placeholder="cup"
                  style={{ ...tinyInput, width: 64, flex: 'none' }} />
                <input value={row.item} onChange={e => updIng(i, 'item', e.target.value)} placeholder="Urad dal"
                  style={{ ...tinyInput, flex: 1 }} />
                <button onClick={() => toggleSubs(i)} aria-label={open ? 'Hide substitutes' : 'Add substitutes'}
                  title={open ? 'Hide alternatives' : 'Add alternatives'}
                  style={{ width: 32, height: 42, flex: 'none', background: open ? alpha(secondary, .14) : 'transparent', border: `1px solid ${open ? secondary : T.surfaceBd}`, borderRadius: 10, cursor: 'pointer', color: open ? secondary : T.dim, fontSize: 15, fontWeight: 700, fontFamily: FONT }}>↺</button>
                {deleteBtn(() => delIng(i), ingredients.length <= 1)}
              </div>
              {open && (
                <div className="cc-pop" style={{ marginTop: 6, marginLeft: 8, paddingLeft: 10, borderLeft: `2px solid ${alpha(secondary, .5)}` }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: T.faint, marginBottom: 4 }}>Alternatives (one per line)</div>
                  <textarea value={row.subs} onChange={e => updIng(i, 'subs', e.target.value)} rows={Math.max(2, row.subs.split('\n').length)}
                    placeholder={'Parboiled rice — most authentic swap\nSona masuri — soak a bit longer'}
                    style={{ ...tinyInput, fontSize: 13.5, lineHeight: 1.42, minHeight: 54 }} />
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addIng} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px dashed ${alpha(primary, .5)}`, borderRadius: 100, padding: '7px 13px', cursor: 'pointer', color: primary, fontFamily: FONT, fontWeight: 700, fontSize: 13, marginTop: 2 }}>+ Add ingredient</button>
        {/* steps */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px' }}>
          <div style={labelStyle}>Steps</div>
          <span style={{ fontSize: 11.5, color: T.faint }}>Required</span>
        </div>
        {steps.map((v, i) => (
          <div key={'s' + i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            {rowBullet(i, primary)}
            <textarea value={v} onChange={e => upd(steps, setSteps, i, e.target.value)} placeholder={`Step ${i + 1}…`} rows={grow(v)}
              style={{ ...inputStyle, minHeight: 42, lineHeight: 1.4 }} />
            {deleteBtn(() => delRow(steps, setSteps, i), steps.length <= 1)}
          </div>
        ))}
        <button onClick={() => addRow(steps, setSteps)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px dashed ${alpha(primary, .5)}`, borderRadius: 100, padding: '7px 13px', cursor: 'pointer', color: primary, fontFamily: FONT, fontWeight: 700, fontSize: 13, marginTop: 2 }}>+ Add step</button>
        {/* tips */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px' }}>
          <div style={labelStyle}>Tips</div>
          <span style={{ fontSize: 11.5, color: T.faint }}>Optional · shown on 💡</span>
        </div>
        {tips.map((v, i) => (
          <div key={'t' + i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
            {rowBullet(i, secondary, '💡')}
            <textarea value={v} onChange={e => upd(tips, setTips, i, e.target.value)} placeholder={`Tip ${i + 1}…`} rows={grow(v)}
              style={{ ...inputStyle, minHeight: 42, lineHeight: 1.4 }} />
            {deleteBtn(() => delRow(tips, setTips, i), tips.length <= 1)}
          </div>
        ))}
        <button onClick={() => addRow(tips, setTips)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px dashed ${alpha(secondary, .5)}`, borderRadius: 100, padding: '7px 13px', cursor: 'pointer', color: secondary, fontFamily: FONT, fontWeight: 700, fontSize: 13, marginTop: 2 }}>+ Add tip</button>
        {/* nutrition */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 10px' }}>
          <div style={labelStyle}>Nutrition</div>
          <span style={{ fontSize: 11.5, color: T.faint }}>Optional</span>
        </div>
        <input value={nut.perQty} onChange={e => updN('perQty', e.target.value)} placeholder="For what quantity? e.g. 1 dosa, 100 g, 1 serving"
          style={{ ...tinyInput, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <input value={nut.calories} onChange={e => updN('calories', e.target.value)} placeholder="kcal" inputMode="numeric"
            style={{ ...tinyInput, flex: 1.4, textAlign: 'center' }} />
          <input value={nut.protein} onChange={e => updN('protein', e.target.value)} placeholder="Protein g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
          <input value={nut.fat} onChange={e => updN('fat', e.target.value)} placeholder="Fat g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
          <input value={nut.carbs} onChange={e => updN('carbs', e.target.value)} placeholder="Carbs g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
        </div>
        <div style={{ fontSize: 11, color: T.faint, margin: '4px 0 6px', letterSpacing: '.04em' }}>Carbs breakdown</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={nut.complex} onChange={e => updN('complex', e.target.value)} placeholder="Complex g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
          <input value={nut.sugar} onChange={e => updN('sugar', e.target.value)} placeholder="Sugars g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
          <input value={nut.fiber} onChange={e => updN('fiber', e.target.value)} placeholder="Fiber g" inputMode="decimal"
            style={{ ...tinyInput, flex: 1, textAlign: 'center' }} />
        </div>
      </div>
    </div>
  );
}

/* ── RECIPE DETAIL ── (Ingredients + Nutrition + Start cooking) */
function qtyStr(q) { if (q == null || q === '') return ''; if (typeof q !== 'number') return String(q); return Number.isInteger(q) ? String(q) : q.toString(); }

function Macro({ label, value, color, T }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 17, color: T.text, lineHeight: 1.05 }}>{value}<span style={{ fontSize: 11, color: T.faint, marginLeft: 1 }}>g</span></div>
      <div style={{ fontSize: 10, color: T.faint, letterSpacing: '.07em', marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ height: 2, width: 24, marginLeft: 'auto', marginTop: 5, background: color, borderRadius: 100, opacity: .7 }}></div>
    </div>
  );
}

function CarbsRow({ label, g, total, T, color }) {
  const pct = total > 0 ? Math.max(2, Math.round((g / total) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
      <div style={{ width: 62, fontSize: 12.5, color: T.dim }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: T.line, borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 100 }}></div>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: T.text, minWidth: 38, textAlign: 'right' }}>{g}g</div>
    </div>
  );
}

function Detail({ T, primary, secondary, persona, recipe, onBack, onStart, onOpenPersona }) {
  const n = recipe.nutrition;
  const [expanded, setExpanded] = useState(null);
  const headStyle = { fontFamily: "var(--head,'Sora'),sans-serif", letterSpacing: '-.01em' };
  const labelStyle = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', height: 48 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: 22, width: 30, textAlign: 'left' }}>←</button>
        <div style={{ ...headStyle, fontWeight: 700, fontSize: 18, color: T.text }}>{recipe.emoji} {recipe.name}</div>
        <button onClick={onOpenPersona} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 700, fontSize: 13.5, fontFamily: FONT, padding: 0 }}>
          <span style={{ fontSize: 16 }}>{persona.emoji}</span>{persona.name}
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 12px' }}>
        {/* meta */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22, fontSize: 12.5, color: T.dim, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.03em' }}>
          {recipe.serves != null && <span>🍽 Serves {recipe.serves}</span>}
          {recipe.totalTime && <span>⏱ {recipe.totalTime}</span>}
          <span>📝 {recipe.steps.length} steps</span>
        </div>
        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={labelStyle}>Ingredients</div>
              {recipe.serves != null && <span style={{ fontSize: 11.5, color: T.faint }}>for {recipe.serves}</span>}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 14, overflow: 'hidden' }}>
              {recipe.ingredients.map((ing, i) => {
                const hasSubs = ing.subs && ing.subs.length > 0;
                const isOpen = expanded === i;
                return (
                  <div key={i} style={{ borderTop: i ? `1px solid ${T.line}` : 'none' }}>
                    <button onClick={() => hasSubs && setExpanded(isOpen ? null : i)} disabled={!hasSubs}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: hasSubs ? 'pointer' : 'default', color: T.text, fontFamily: FONT }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: primary, fontWeight: 600, minWidth: 88, flex: 'none' }}>
                        {ing.qty != null && ing.qty !== '' ? `${qtyStr(ing.qty)} ${ing.unit}` : ing.unit}
                      </span>
                      <span style={{ fontSize: 14.5, color: T.text, flex: 1 }}>{ing.item}</span>
                      {hasSubs && (
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: isOpen ? primary : T.faint, display: 'flex', alignItems: 'center', gap: 4, transition: '.15s', flex: 'none' }}>
                          <span style={{ fontSize: 13 }}>↺</span>{isOpen ? 'Hide' : 'Swap'}
                        </span>
                      )}
                    </button>
                    {hasSubs && isOpen && (
                      <div className="cc-pop" style={{ padding: '0 14px 12px', background: alpha(secondary, .07), borderTop: `1px dashed ${alpha(secondary, .32)}` }}>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: T.faint, padding: '9px 0 6px' }}>No {ing.item.toLowerCase()}? Try:</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {ing.subs.map((s, j) => {
                            const parts = s.split(/\s—\s|\s-\s/);
                            const head = parts[0];
                            const note = parts.slice(1).join(' — ').trim();
                            return (
                              <li key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.42 }}>
                                <span style={{ color: secondary, fontWeight: 800, flex: 'none', marginTop: 1 }}>↳</span>
                                <span>
                                  <b style={{ color: T.text, fontWeight: 600 }}>{head.trim()}</b>
                                  {note && <span style={{ color: T.dim, fontStyle: 'italic' }}> — {note}</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Nutrition */}
        {n && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={labelStyle}>Nutrition</div>
              {n.perQty && <span style={{ fontSize: 11.5, color: T.faint }}>per {n.perQty}</span>}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 14, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.line}` }}>
                <div>
                  <div style={{ ...headStyle, fontSize: 34, fontWeight: 800, color: T.text, lineHeight: 1 }}>{n.calories}</div>
                  <div style={{ fontSize: 11, color: T.faint, letterSpacing: '.08em', marginTop: 5, textTransform: 'uppercase' }}>kcal</div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <Macro label="Protein" value={n.protein_g} color={secondary} T={T} />
                  <Macro label="Fat" value={n.fat_g} color={primary} T={T} />
                  <Macro label="Carbs" value={n.carbs_g} color={alpha(primary, .55)} T={T} />
                </div>
              </div>
              {n.carbs && (
                <div>
                  <div style={{ fontSize: 11, color: T.faint, letterSpacing: '.08em', marginBottom: 9, textTransform: 'uppercase' }}>Carbs breakdown</div>
                  <CarbsRow label="Complex" g={n.carbs.complex_g} total={n.carbs_g} T={T} color={secondary} />
                  <CarbsRow label="Sugars" g={n.carbs.sugar_g} total={n.carbs_g} T={T} color={primary} />
                  <CarbsRow label="Fiber" g={n.carbs.fiber_g} total={n.carbs_g} T={T} color={alpha(secondary, .55)} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: '4px 22px 6px' }}>
        <button onClick={onStart} style={{ width: '100%', background: primary, color: T.onPrimary, border: 'none', borderRadius: 14, padding: '15px', fontWeight: 800, fontSize: 15.5, cursor: 'pointer', fontFamily: FONT, letterSpacing: '.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 10px 24px ${alpha(primary, .32)}` }}>
          🎤 Start cooking
        </button>
      </div>
    </div>
  );
}

/* ── small voice-state chip used in Cooking header ── */
function VoiceStatusChip({ vstate, primary, secondary, T }) {
  const monoBase = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 };
  if (vstate === 'speaking') return (
    <span className="cc-pop" style={{ ...monoBase, display: 'flex', alignItems: 'center', gap: 7, padding: '4px 11px 4px 6px', background: alpha(secondary, .12), border: `1px solid ${alpha(secondary, .4)}`, borderRadius: 100, color: secondary }}>
      <SpeakerRings active color={secondary} size={20} /> Speaking
    </span>
  );
  if (vstate === 'listening') return (
    <span className="cc-pop" style={{ ...monoBase, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', background: alpha(primary, .12), border: `1px solid ${alpha(primary, .4)}`, borderRadius: 100, color: primary }}>
      <WaveBars active color={primary} bars={5} height={12} /> Listening
    </span>
  );
  if (vstate === 'processing') return (
    <span className="cc-pop" style={{ ...monoBase, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 100, color: T.dim }}>
      <span className="cc-spin" style={{ borderColor: alpha(secondary, .3), borderTopColor: secondary }} /> Processing
    </span>
  );
  return null;
}

/* ── step text with word-by-word progressive highlight (for speak progress) ── */
function ProgressiveText({ text, progress, T, headStyle }) {
  const words = (text || '').split(/(\s+)/);
  const wordCount = words.filter(w => w.trim()).length || 1;
  const highlighted = Math.min(wordCount, Math.ceil((progress || 0) * wordCount));
  let idx = 0;
  return (
    <div style={{ ...headStyle, fontWeight: 600, fontSize: 21, lineHeight: 1.35, letterSpacing: '-.01em', marginBottom: 12, textWrap: 'pretty' }}>
      “
      {words.map((w, i) => {
        if (!w.trim()) return <span key={i}>{w}</span>;
        const pos = idx++;
        const on = pos < highlighted;
        return <span key={i} style={{ color: on ? T.text : T.faint, fontWeight: on ? 700 : 500, transition: '.18s' }}>{w}</span>;
      })}
      ”
    </div>
  );
}

/* ── chat-style conversation thread ── */
function ConversationThread({ conv, T, primary, liveListen, liveTranscript }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [conv?.length, liveTranscript]);
  const empty = (!conv || !conv.length) && !liveListen;
  return (
    <div ref={ref} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 2px 2px', margin: '2px 0' }}>
      {empty && (
        <div style={{ textAlign: 'center', color: T.faint, fontSize: 11.5, padding: '14px 0', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.05em' }}>
          Your conversation will appear here.
        </div>
      )}
      {(conv || []).map((turn, i) => {
        const isUser = turn.role === 'user';
        return (
          <div key={i} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <div className="cc-pop" style={{ maxWidth: '85%', padding: '8px 11px', borderRadius: 14, borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4, background: isUser ? primary : T.surface, color: isUser ? '#fff' : T.text, border: isUser ? 'none' : `1px solid ${T.surfaceBd}`, fontSize: 13, lineHeight: 1.4 }}>
              {turn.text}
            </div>
          </div>
        );
      })}
      {/* live partial transcript while listening */}
      {liveListen && liveTranscript && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '85%', padding: '8px 11px', borderRadius: 14, borderBottomRightRadius: 4, background: alpha(primary, .15), color: primary, fontSize: 13, lineHeight: 1.4, border: `1px dashed ${alpha(primary, .5)}`, fontStyle: 'italic' }}>
            {liveTranscript}<span style={{ opacity: .6 }}>…</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── COOKING ── */
function Cooking({ T, primary, secondary, persona, recipe, step, vstate, input, setInput,
  onBack, onMic, onSend, onIntent, onOpenPersona, onFocus, onBlur,
  conversation, speakProgress, liveTranscript }) {
  const total = recipe.steps.length;
  const headStyle = { fontFamily: "var(--head,'Sora'),sans-serif" };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 22px', overflow: 'hidden' }}>
      {/* header: ←  Dosa  👵 Amma */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, flex: 'none' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: 22, width: 30, textAlign: 'left' }}>←</button>
        <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 17, color: T.text, letterSpacing: '-.01em' }}>{recipe.emoji} {recipe.name}</div>
        <button onClick={onOpenPersona} title="Switch persona" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: primary, fontWeight: 700, fontSize: 13, fontFamily: FONT, padding: 0 }}>
          <span style={{ fontSize: 15 }}>{persona.emoji}</span>{persona.name}
        </button>
      </div>

      {/* step header: indicator + voice chip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, minHeight: 24, flex: 'none' }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.1em', color: primary, fontWeight: 500 }}>Step {step + 1} of {total}</span>
        <VoiceStatusChip vstate={vstate} primary={primary} secondary={secondary} T={T} />
      </div>

      {/* step text with progressive word highlight while speaking */}
      <div style={{ flex: 'none' }}>
        <ProgressiveText
          text={recipe.steps[step]}
          progress={vstate === 'speaking' ? (speakProgress || 0) : 1}
          T={T}
          headStyle={headStyle}
        />
      </div>

      {/* conversation thread (flex-grow) */}
      <ConversationThread conv={conversation} T={T} primary={primary} secondary={secondary}
        liveListen={vstate === 'listening'} liveTranscript={liveTranscript} />

      {/* text command input row (with mic) */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 9, flex: 'none' }}>
        <button onClick={onMic} className={vstate === 'listening' ? 'cc-pulse' : ''} title="Mic"
          style={{ ['--cc-ring']: alpha(primary, .32), width: 44, flex: 'none', background: vstate === 'listening' ? primary : T.surface, border: `1px solid ${vstate === 'listening' ? primary : T.surfaceBd}`, color: vstate === 'listening' ? T.onPrimary : primary, borderRadius: 13, fontSize: 17, cursor: 'pointer' }}>🎤</button>
        <input value={input} onFocus={onFocus} onBlur={onBlur}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSend(); }}
          placeholder="Type command: next / repeat / skip / ask question"
          style={{ flex: 1, padding: '12px 14px', borderRadius: 13, border: `1px solid ${vstate === 'text' ? primary : T.surfaceBd}`, boxShadow: vstate === 'text' ? `0 0 0 3px ${alpha(primary, .18)}` : 'none', background: T.inputBg, color: T.inputText, fontFamily: FONT, fontSize: 14.5, outline: 'none', transition: '.15s' }} />
        <button onClick={onSend} style={{ background: primary, color: T.onPrimary, border: 'none', borderRadius: 13, padding: '0 16px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, flex: 'none' }}>Send</button>
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 6, flex: 'none' }}>
        <Btn kind="solid" T={T} primary={primary} onClick={() => onIntent('NEXT')} style={{ flex: 1 }}>Next</Btn>
        <Btn T={T} primary={primary} onClick={() => onIntent('REPEAT')} style={{ flex: 1 }}>Repeat</Btn>
        <Btn T={T} primary={primary} onClick={() => onIntent('SKIP')} style={{ flex: 1 }}>Skip</Btn>
        <Btn T={T} primary={primary} onClick={() => onIntent('BACK')} disabled={step === 0} style={{ flex: 1 }}>Back</Btn>
      </div>
    </div>
  );
}

/* ── SHARE ── */
function Share({ T, primary, recipe, txt, setTxt, onShare, onCopy, onAgain }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px', alignItems: 'center' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <div className="cc-pop" style={{ fontSize: 60, marginBottom: 8 }}>🎉</div>
        <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 800, fontSize: 26, color: T.text, letterSpacing: '-.02em', marginBottom: 6 }}>Cooking Complete!</div>
        <div style={{ color: T.dim, fontSize: 14.5, marginBottom: 22, textAlign: 'center' }}>You made {recipe.emoji} <b style={{ color: T.text }}>{recipe.name}</b>. Share the love.</div>
        <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={4}
          style={{ width: '100%', padding: '15px 16px', borderRadius: 16, border: `1px solid ${T.surfaceBd}`, background: T.surface, color: T.text, fontFamily: FONT, fontSize: 14.5, lineHeight: 1.5, resize: 'none', outline: 'none' }} />
      </div>
      <div style={{ width: '100%', display: 'flex', gap: 9, marginBottom: 10 }}>
        <Btn kind="primary" T={T} primary={primary} onClick={onShare} style={{ flex: 1 }}>Share</Btn>
        <Btn T={T} primary={primary} onClick={onCopy} style={{ flex: 1 }}>Copy</Btn>
      </div>
      <button onClick={onAgain} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.faint, fontFamily: FONT, fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>↺ Cook something else</button>
    </div>
  );
}

/* ── overlays ── */
/* Voice input — opens when the user taps the mic. Tries real STT (Web Speech API);
   always supports typed/chip fallback so any phrase routes through detectIntent. */
function VoiceInputSheet({ T, primary, recipe, source, liveText, onClose, onSubmit, sttSupported, sttError, sttBackend, onTranscribe }) {
  const [text, setText] = useState('');
  const [recState, setRecState] = useState('idle'); // idle | recording | transcribing
  const inputRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const mountedRef = useRef(true);
  const canRecord = sttBackend && typeof navigator !== 'undefined' && navigator.mediaDevices && window.MediaRecorder;
  useEffect(() => { inputRef.current && setTimeout(() => inputRef.current.focus(), 120); }, []);
  useEffect(() => { if (liveText) setText(liveText); }, [liveText]);
  useEffect(() => () => {
    mountedRef.current = false;
    try { if (mediaRef.current && mediaRef.current.state === 'recording') mediaRef.current.stop(); } catch (e) { /* ignore */ }
  }, []);

  async function toggleRecord() {
    if (recState === 'recording') { try { mediaRef.current && mediaRef.current.stop(); } catch (e) { /* ignore */ } return; }
    if (recState === 'transcribing') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        if (mountedRef.current) setRecState('transcribing');
        await onTranscribe(blob);
        if (mountedRef.current) setRecState('idle');
      };
      mediaRef.current = mr; mr.start(); setRecState('recording');
    } catch (e) { setRecState('idle'); }
  }

  let chips;
  if (source === 'home') {
    chips = Object.keys(RECIPES || {}).map(k => `How to make ${RECIPES[k].name.toLowerCase()}`);
  } else {
    const stepTagBased = (recipe?.stepTags || []).map(tags => `Go to ${tags[0]}`).slice(0, 3);
    chips = ['Next', 'Repeat', 'Skip', 'Back', ...stepTagBased, 'Done'];
  }

  function commit(phrase) {
    const p = (phrase || text).trim(); if (!p) return;
    onSubmit(p);
    setText('');
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 35, background: T.scrim, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="cc-sheet" style={{ width: '100%', background: T.sheet, borderRadius: '26px 26px 0 0', padding: '18px 22px 24px', boxShadow: '0 -20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ width: 38, height: 5, borderRadius: 100, background: T.surfaceBd, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="cc-pulse" style={{ ['--cc-ring']: alpha(primary, .35), width: 48, height: 48, borderRadius: '50%', background: primary, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 20, flex: 'none' }}>🎤</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: primary, fontWeight: 700, marginBottom: 4 }}>
              {sttSupported && !sttError ? 'Listening…' : 'Listening (preview)'}
            </div>
            <WaveBars active color={primary} bars={18} height={20} />
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: `1px solid ${T.surfaceBd}`, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', color: T.dim, fontSize: 16, flex: 'none' }}>✕</button>
        </div>

        {liveText && (
          <div style={{ background: alpha(primary, .10), border: `1px dashed ${alpha(primary, .5)}`, borderRadius: 12, padding: '10px 13px', color: T.text, fontSize: 14, marginBottom: 10, fontStyle: 'italic', lineHeight: 1.4 }}>
            {liveText}<span style={{ opacity: .5 }}>…</span>
          </div>
        )}

        {(!sttSupported || sttError) && (
          <div style={{ fontSize: 12, color: T.faint, marginBottom: 10, lineHeight: 1.45 }}>
            {sttError === 'not-allowed'
              ? 'Mic permission was denied — type or pick a command. Both go through the same intent pipeline.'
              : 'Mic capture isn’t available here — pick a command or type any phrase. Long phrases work too (e.g. “go back to the grinding step”).'}
          </div>
        )}

        {canRecord && (
          <button onClick={toggleRecord} disabled={recState === 'transcribing'}
            style={{ width: '100%', marginBottom: 14, padding: '12px', borderRadius: 13, cursor: recState === 'transcribing' ? 'default' : 'pointer', fontFamily: FONT, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: recState === 'recording' ? alpha(primary, .14) : primary,
              color: recState === 'recording' ? primary : T.onPrimary,
              border: recState === 'recording' ? `1.5px solid ${primary}` : 'none' }}>
            {recState === 'recording' ? <><span className="cc-mic-dot" style={{ background: primary }} /> Stop &amp; transcribe</>
              : recState === 'transcribing' ? <><span className="cc-spin" style={{ borderColor: alpha(T.onPrimary, .4), borderTopColor: T.onPrimary }} /> Transcribing…</>
              : <>🎙 Record &amp; transcribe (AI)</>}
          </button>
        )}

        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 8 }}>Quick commands</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {chips.map((c, i) => (
            <button key={i} onClick={() => commit(c)} style={{ background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 100, padding: '7px 12px', cursor: 'pointer', color: T.text, fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{c}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); }}
            placeholder={source === 'home' ? 'Say or type: how to make dosa' : 'Say or type any command — e.g. “go back to grinding”'}
            style={{ flex: 1, padding: '12px 14px', borderRadius: 13, border: `1px solid ${T.surfaceBd}`, background: T.inputBg, color: T.inputText, fontFamily: 'inherit', fontSize: 14.5, outline: 'none' }} />
          <button onClick={() => commit()} style={{ background: primary, color: T.onPrimary, border: 'none', borderRadius: 13, padding: '0 18px', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function PersonaModal({ T, primary, current, onConfirm, onClose }) {
  const [picked, setPicked] = useState(current);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30, background: T.scrim, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} className="cc-sheet" style={{ width: '100%', background: T.sheet, borderRadius: '26px 26px 0 0', padding: '22px 22px 26px', boxShadow: '0 -20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ width: 38, height: 5, borderRadius: 100, background: T.surfaceBd, margin: '0 auto 18px' }} />
        <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 18, color: T.text, marginBottom: 14 }}>Choose Companion</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {Object.values(PERSONAS).map(p => {
            const on = p.id === picked;
            return (
              <button key={p.id} onClick={() => setPicked(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', background: on ? alpha(primary, .1) : T.surface, border: `1.5px solid ${on ? primary : T.surfaceBd}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer' }}>
                <span style={{ fontSize: 26 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{p.name}</div>
                  <div style={{ color: T.dim, fontSize: 13 }}>({p.tone})</div>
                </div>
                {on && <span style={{ color: primary, fontWeight: 800, fontSize: 18 }}>✓</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => onConfirm(picked)} style={{ width: '100%', background: primary, color: T.onPrimary, border: 'none', borderRadius: 14, padding: '13px', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: FONT, letterSpacing: '.02em' }}>Select</button>
      </div>
    </div>
  );
}

function SuggestionOverlay({ T, primary, secondary, data, refine, setRefine, onAsk, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 30, background: T.scrim, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} className="cc-pop" style={{ width: '100%', background: T.sheet, borderRadius: 22, padding: '22px 20px', boxShadow: '0 24px 60px rgba(0,0,0,.3)', border: `1px solid ${T.surfaceBd}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: alpha(primary, .14), fontSize: 17 }}>💡</span>
          <span style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 16, color: T.text }}>{data.title}</span>
        </div>
        {data.q && <div style={{ fontSize: 13, color: T.faint, fontStyle: 'italic', marginBottom: 8 }}>“{data.q}”</div>}
        <div style={{ fontSize: 15.5, lineHeight: 1.5, color: T.text, marginBottom: 18 }}>{data.text}</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input value={refine} onChange={e => setRefine(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAsk(); }}
            placeholder="Refine your question…"
            style={{ flex: 1, padding: '11px 13px', borderRadius: 12, border: `1px solid ${T.surfaceBd}`, background: T.inputBg, color: T.inputText, fontFamily: FONT, fontSize: 14, outline: 'none' }} />
          <button onClick={onAsk} style={{ background: secondary, color: '#fff', border: 'none', borderRadius: 12, padding: '0 15px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: FONT }}>Ask</button>
        </div>
        <button onClick={onClose} style={{ width: '100%', background: T.ghostBg, border: `1px solid ${T.ghostBd}`, color: T.ghostText, borderRadius: 12, padding: '11px', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: FONT }}>Close</button>
      </div>
    </div>
  );
}

function Toast({ T, msg }) {
  if (!msg) return null;
  return (
    <div className="cc-toast" style={{ position: 'absolute', left: 18, right: 18, bottom: 96, zIndex: 40, background: T.solidBg, color: T.solidText, borderRadius: 14, padding: '13px 16px', fontFamily: FONT, fontSize: 13.5, fontWeight: 500, boxShadow: '0 12px 30px rgba(0,0,0,.28)', display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 15 }}>💬</span>{msg}
    </div>
  );
}

/* ── APP ── */
const TWEAK_DEFAULTS = {
  primary: '#C9542B',
  secondary: '#5B7553',
  persona: 'amma',
  dark: false,
  sound: true,
  headFont: 'Sora',
  language: 'en-IN',
};

const LANGUAGES = [
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'te-IN', label: 'Telugu' },
  { value: 'kn-IN', label: 'Kannada' },
  { value: 'ml-IN', label: 'Malayalam' },
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'bn-IN', label: 'Bengali' },
];

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const T = theme(t);
  const primary = t.primary, secondary = t.secondary;

  const [screen, setScreen] = useState('home');
  const [recipe, setRecipe] = useState(null);
  const [step, setStep] = useState(0);
  const [vstate, setVstate] = useState('idle');
  const [input, setInput] = useState('');
  const [personaId, setPersonaId] = useState(t.persona);
  const [showPersona, setShowPersona] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [refine, setRefine] = useState('');
  const [toast, setToast] = useState(null);
  const [shareTxt, setShareTxt] = useState('');
  const [speakKey, setSpeakKey] = useState(0);  // bump to re-speak current step (REPEAT)
  const [customRecipes, setCustomRecipes] = useState({});
  const [recents, setRecents] = useState(RECENT);
  const [showTweaks, setShowTweaks] = useState(false);
  const allRecipes = { ...RECIPES, ...customRecipes };
  const micFail = useRef(true);
  const timers = useRef([]);
  const persona = PERSONAS[personaId];

  // ── history + conversation state ──
  const [history, setHistory] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [speakProgress, setSpeakProgress] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [viewingRun, setViewingRun] = useState(null);
  const [voiceSheet, setVoiceSheet] = useState(null);  // {source:'home'|'cook'} | null
  const [sttError, setSttError] = useState(null);
  const currentRunRef = useRef(null);
  const stepsReachedRef = useRef(0);
  const speakIntervalRef = useRef(null);
  const audioRef = useRef(null);
  const sttRef = useRef(null);
  const sttSupported = !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  // backend voice capabilities (ElevenLabs TTS / Sarvam STT+TTS), null until probed
  const [voiceCaps, setVoiceCaps] = useState(null);

  useEffect(() => { ensureSeedHistory(); setHistory(readHistory()); }, []);
  useEffect(() => { getCapabilities().then(setVoiceCaps); }, []);

  useEffect(() => { setPersonaId(t.persona); }, [t.persona]);
  useEffect(() => { document.documentElement.style.setProperty('--head', `'${t.headFont}',sans-serif`); }, [t.headFont]);
  useEffect(() => { document.body.style.background = T.dark ? '#0c0a07' : '#e9e6e1'; }, [T.dark]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 2800); return () => clearTimeout(id); }, [toast]);
  // cleanup speech on unmount
  useEffect(() => () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }, []);

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = []; if (speakIntervalRef.current) { clearInterval(speakIntervalRef.current); speakIntervalRef.current = null; } }
  function after(ms, fn) { const id = setTimeout(fn, ms); timers.current.push(id); }

  // ── run/conversation helpers ──
  function persistRun() {
    const run = currentRunRef.current; if (!run) return;
    run.stepsReached = Math.max(run.stepsReached || 0, stepsReachedRef.current);
    const h = readHistory().filter(r => r.id !== run.id);
    const updated = [run, ...h];
    writeHistory(updated); setHistory(updated);
  }
  function pushTurn(role, text) {
    const turn = { role, text, t: Date.now() };
    if (currentRunRef.current) currentRunRef.current.conversation.push(turn);
    setConversation(c => [...c, turn]);
    persistRun();
  }
  function pushAction(kind, meta) {
    if (currentRunRef.current) appendAction(currentRunRef.current, kind, meta);
    persistRun();
  }

  // stop any in-flight audio (backend element or browser TTS) + progress tick
  function stopSpeak() {
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) { /* ignore */ } audioRef.current = null; }
    stopSpeak();
    if (speakIntervalRef.current) { clearInterval(speakIntervalRef.current); speakIntervalRef.current = null; }
  }

  // Speak a step: prefer backend TTS (ElevenLabs / Sarvam, multilingual), then
  // fall back to the browser's speechSynthesis, then to a silent timer. In every
  // path the state ends up transitioning speaking -> listening (auto-listen).
  async function speak(text) {
    if (!t.sound) return false;
    stopSpeak();
    const words = text.split(/\s+/).length;
    const estMs = Math.max(1800, Math.min(8000, (words / 2.5) * 1000 + 800));
    const finish1 = () => {
      setVstate(s => s === 'speaking' ? 'listening' : s);
      setSpeakProgress(1);
      if (speakIntervalRef.current) { clearInterval(speakIntervalRef.current); speakIntervalRef.current = null; }
    };

    // 1) backend TTS
    const caps = voiceCaps || await getCapabilities();
    if (caps && (caps.elevenlabs || caps.sarvam)) {
      const url = await synthesize(text, { language: t.language });
      if (url) {
        const a = new Audio(url);
        audioRef.current = a;
        let done = false;
        const fin = () => {
          if (done) return; done = true;
          try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
          if (audioRef.current === a) audioRef.current = null;
          finish1();
        };
        a.onended = fin; a.onerror = fin;
        a.ontimeupdate = () => { if (a.duration && isFinite(a.duration)) setSpeakProgress(Math.min(1, a.currentTime / a.duration)); };
        setSpeakProgress(0);
        try { await a.play(); } catch (e) { /* autoplay blocked — safety timer below */ }
        after(estMs + 2000, fin);
        return true;
      }
    }

    // 2) browser speechSynthesis fallback
    try {
      const synth = window.speechSynthesis; if (!synth) throw new Error('no synth');
      const u = new SpeechSynthesisUtterance(text);
      u.rate = persona.rate; u.pitch = persona.pitch; u.lang = t.language || 'en-US';
      let done = false;
      const fin = () => { if (done) return; done = true; finish1(); };
      u.onend = fin;
      synth.speak(u);
      after(estMs, fin);
      setSpeakProgress(0);
      const start = Date.now();
      speakIntervalRef.current = setInterval(() => {
        const p = Math.min(1, (Date.now() - start) / estMs);
        setSpeakProgress(p);
        if (p >= 1 || done) { clearInterval(speakIntervalRef.current); speakIntervalRef.current = null; }
      }, 90);
      return true;
    } catch (e) {
      // 3) no audio at all — still advance to listening
      setSpeakProgress(1);
      after(1400, () => setVstate(s => s === 'speaking' ? 'listening' : s));
      return false;
    }
  }
  function speakStep(i) {
    if (!recipe) return;
    pushTurn('system', recipe.steps[i]);
    stepsReachedRef.current = Math.max(stepsReachedRef.current, i + 1);
    setLiveTranscript('');
    if (!t.sound) { setVstate('listening'); setSpeakProgress(1); return; }
    setVstate('speaking');
    speak(recipe.steps[i]); // handles backend/browser/silent fallbacks + transition
  }

  // Speak current step whenever it changes or REPEAT is requested.
  // Driven by useEffect so we ALWAYS run in the latest render context (no stale-closure bugs).
  useEffect(() => {
    if (screen !== 'cooking' || !recipe) return;
    const id = setTimeout(() => speakStep(step), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, recipe, step, speakKey]);

  // Auto-listen lifecycle: after audio play, system listens; times out to idle UNLESS voice sheet is open.
  useEffect(() => {
    if (vstate !== 'listening') return;
    if (voiceSheet) return; // user is actively in the voice capture sheet
    const id = setTimeout(() => setVstate(s => s === 'listening' ? 'idle' : s), 8000);
    return () => clearTimeout(id);
  }, [vstate, voiceSheet]);

  function openRecipe(id) {
    clearTimers();
    // save any in-progress run as partial before switching recipes
    if (currentRunRef.current) {
      currentRunRef.current.finished = Date.now();
      currentRunRef.current.durationMs = currentRunRef.current.finished - currentRunRef.current.started;
      persistRun();
      currentRunRef.current = null;
    }
    const r = allRecipes[id]; if (!r) return;
    stopSpeak();
    setRecipe(r); setStep(0); setInput(''); setVstate('idle'); micFail.current = true;
    setConversation([]); stepsReachedRef.current = 0; setSpeakProgress(0); setLiveTranscript('');
    setScreen('detail');
  }
  function startCooking() {
    currentRunRef.current = startRun(recipe, personaId);
    setConversation([]); stepsReachedRef.current = 1; setLiveTranscript('');
    setStep(0); setScreen('cooking');
    setSpeakKey(k => k + 1); // trigger speakStep for step 0
    persistRun();
  }

  function finish() {
    clearTimers();
    stopSpeak();
    setVstate('idle');
    if (currentRunRef.current) {
      currentRunRef.current.completed = true;
      currentRunRef.current.finished = Date.now();
      currentRunRef.current.durationMs = currentRunRef.current.finished - currentRunRef.current.started;
      stepsReachedRef.current = currentRunRef.current.stepsTotal;
      appendAction(currentRunRef.current, 'done');
      persistRun();
      currentRunRef.current = null;
    }
    setShareTxt(shareText(recipe));
    setScreen('share');
  }

  function handleIntent(intent, target) {
    if (!recipe) return;
    const last = recipe.steps.length - 1;
    const kind = (intent === 'GOTO' && typeof target === 'number') ? 'goto' : intent.toLowerCase();
    pushAction(kind, intent === 'GOTO' ? { target } : null);
    if (intent === 'NEXT' || intent === 'SKIP') {
      setStep(prev => { if (prev >= last) { after(0, finish); return prev; } const n = prev + 1; stepsReachedRef.current = Math.max(stepsReachedRef.current, n + 1); return n; });
    } else if (intent === 'REPEAT') { setSpeakKey(k => k + 1); }
    else if (intent === 'BACK') { setStep(prev => prev <= 0 ? prev : prev - 1); }
    else if (intent === 'GOTO' && typeof target === 'number') {
      setStep(prev => { if (target === prev) setSpeakKey(k => k + 1); return target; });
      stepsReachedRef.current = Math.max(stepsReachedRef.current, target + 1);
      setToast(`Jumping to step ${target + 1}`);
    }
    else if (intent === 'DONE') { finish(); }
    else { /* QUERY */ openTip(true); }
  }

  // HOME mic — open voice input sheet (real STT if available, typed fallback otherwise)
  function micHome() { startVoiceCapture('home'); }
  // COOKING mic — same path: capture any phrase, route through detectIntent
  function micCook() { startVoiceCapture('cook'); }

  function startVoiceCapture(source) {
    clearTimers(); setLiveTranscript(''); setSttError(null);
    setVstate('listening');
    setVoiceSheet({ source });
    if (!sttSupported) return;
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      // stop previous
      if (sttRef.current) { try { sttRef.current.abort(); } catch (e) { /* ignore */ } sttRef.current = null; }
      const rec = new SR();
      rec.continuous = false; rec.interimResults = true; rec.lang = t.language || 'en-US';
      rec.onresult = (e) => {
        let interim = '', final = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
          else interim += e.results[i][0].transcript;
        }
        if (interim) setLiveTranscript(interim);
        if (final.trim()) { setLiveTranscript(''); stopVoiceCapture(); processVoicePhrase(final.trim(), source); }
      };
      rec.onerror = (e) => { setSttError(e.error || 'error'); };
      rec.onend = () => { if (sttRef.current === rec) sttRef.current = null; };
      sttRef.current = rec;
      rec.start();
    } catch (err) { setSttError('start-failed'); }
  }

  function stopVoiceCapture() {
    if (sttRef.current) { try { sttRef.current.abort(); } catch (e) { /* ignore */ } sttRef.current = null; }
    setVoiceSheet(null);
    setLiveTranscript('');
  }

  function processVoicePhrase(text, source) {
    if (!text || !text.trim()) return;
    stopVoiceCapture();
    if (source === 'home') {
      pushTurn('user', text);
      // resolve recipe by name
      let id = null; const q = text.toLowerCase();
      for (const k of Object.keys(allRecipes)) {
        if (q.includes(k) || q.includes(allRecipes[k].name.toLowerCase())) { id = k; break; }
      }
      if (id) { setVstate('processing'); after(300, () => { setVstate('idle'); openRecipe(id); }); }
      else { setVstate('idle'); setToast('Couldn’t find that recipe. Try another one.'); }
    } else {
      pushTurn('user', text);
      setVstate('processing');
      after(220, () => {
        const r = detectIntent(text, recipe);
        if (r.intent === 'QUERY') { pushAction('query', { q: text }); openTip(true, text); setVstate(s => s === 'processing' ? 'idle' : s); }
        else handleIntent(r.intent, r.target);
      });
    }
  }
  function onSearch() {
    const q = (input || '').toLowerCase();
    let id = null;
    for (const k of Object.keys(allRecipes)) {
      if (q.includes(k) || q.includes(allRecipes[k].name.toLowerCase())) { id = k; break; }
    }
    if (id) openRecipe(id);
    else setToast('Couldn’t find that recipe. Try another one.');
  }

  function onSend() {
    if (!input.trim()) return;
    const text = input.trim();
    pushTurn('user', text);
    const r = detectIntent(text, recipe);
    if (r.intent === 'QUERY') { pushAction('query', { q: text }); openTip(true, text); }
    else handleIntent(r.intent, r.target);
    setInput('');
  }

  function openTip(isQuery, q) { setRefine(''); setSuggestion({ title: isQuery ? 'About this step' : 'Suggestion', text: recipe.tips[step], q: isQuery ? (q || null) : null }); }
  function askRefine() { if (!refine.trim()) return; setSuggestion(s => ({ title: 'About this step', text: recipe.tips[(step + 1) % recipe.tips.length], q: refine })); setRefine(''); }

  function doShare() { try { if (navigator.share) { navigator.share({ text: shareTxt }); return; } } catch (e) { /* ignore */ } setToast('Shared! 🎉'); }
  function saveNewRecipe(r) {
    const base = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || ('r' + Date.now());
    let id = base; let n = 2; while (allRecipes[id]) { id = base + '-' + n++; }
    const tips = r.tips.length ? r.tips : ['Add tips later to give helpful hints here.'];
    const stepTags = r.steps.map(deriveStepTags);
    setCustomRecipes(c => ({ ...c, [id]: { id, name: r.name, emoji: r.emoji, serves: r.serves, steps: r.steps, tips, stepTags, ingredients: r.ingredients, nutrition: r.nutrition, totalTime: r.totalTime } }));
    setRecents(rs => [id, ...rs.filter(x => x !== id)].slice(0, 6));
    setScreen('home'); setToast(`Saved ${r.emoji} ${r.name}`);
  }
  function doCopy() { try { navigator.clipboard && navigator.clipboard.writeText(shareTxt); } catch (e) { /* ignore */ } setToast('Copied to clipboard'); }
  function reset() {
    clearTimers();
    if (currentRunRef.current) {
      currentRunRef.current.finished = Date.now();
      currentRunRef.current.durationMs = currentRunRef.current.finished - currentRunRef.current.started;
      persistRun();
      currentRunRef.current = null;
    }
    setScreen('home'); setRecipe(null); setStep(0); setInput(''); setVstate('idle');
    setConversation([]); stepsReachedRef.current = 0; setSpeakProgress(0); setLiveTranscript('');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 16px', background: T.dark ? '#0c0a07' : '#e9e6e1', transition: '.25s' }}>
      <div style={{ position: 'relative' }}>
        <IOSDevice dark={T.dark}>
          {/* full-screen app surface below the status bar */}
          <div style={{ position: 'absolute', inset: 0, background: T.bg, transition: 'background .25s' }}>
            <div style={{ position: 'absolute', top: 54, left: 0, right: 0, bottom: 24, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
              {screen === 'home' && (
                <Home T={T} primary={primary} secondary={secondary} persona={persona} vstate={vstate}
                  input={input} setInput={setInput} onMic={micHome} onSearch={onSearch}
                  onRecent={openRecipe} onOpenPersona={() => setShowPersona(true)}
                  onOpenAdd={() => setScreen('add')}
                  onOpenProfile={() => setScreen('profile')}
                  recipes={allRecipes} recents={recents}
                  onFocus={() => setVstate('text')} onBlur={() => setVstate(s => s === 'text' ? 'idle' : s)} />
              )}
              {screen === 'add' && (
                <AddRecipe T={T} primary={primary} secondary={secondary}
                  onSave={saveNewRecipe} onCancel={() => setScreen('home')} />
              )}
              {screen === 'detail' && recipe && (
                <Detail T={T} primary={primary} secondary={secondary} persona={persona} recipe={recipe}
                  onBack={() => setScreen('home')} onStart={startCooking}
                  onOpenPersona={() => setShowPersona(true)} />
              )}
              {screen === 'cooking' && recipe && (
                <Cooking T={T} primary={primary} secondary={secondary} persona={persona} recipe={recipe} step={step}
                  vstate={vstate} input={input} setInput={setInput}
                  conversation={conversation} speakProgress={speakProgress} liveTranscript={liveTranscript}
                  onBack={() => setScreen('detail')} onMic={micCook} onSend={onSend} onIntent={handleIntent}
                  onOpenPersona={() => setShowPersona(true)}
                  onFocus={() => setVstate('text')} onBlur={() => setVstate(s => s === 'text' ? 'idle' : s)} />
              )}
              {screen === 'profile' && (
                <Profile T={T} primary={primary} secondary={secondary} history={history}
                  onBack={() => setScreen('home')} onOpenRun={(run) => { setViewingRun(run); setScreen('run'); }} />
              )}
              {screen === 'run' && viewingRun && (
                <RunDetail T={T} primary={primary} secondary={secondary} run={viewingRun}
                  onBack={() => { setScreen('profile'); setViewingRun(null); }} />
              )}
              {screen === 'share' && recipe && (
                <Share T={T} primary={primary} secondary={secondary} recipe={recipe}
                  txt={shareTxt} setTxt={setShareTxt} onShare={doShare} onCopy={doCopy} onAgain={reset} />
              )}
            </div>

            {showPersona && <PersonaModal T={T} primary={primary} current={personaId}
              onConfirm={(id) => { setPersonaId(id); setTweak('persona', id); setShowPersona(false); }} onClose={() => setShowPersona(false)} />}
            {suggestion && <SuggestionOverlay T={T} primary={primary} secondary={secondary} data={suggestion}
              refine={refine} setRefine={setRefine} onAsk={askRefine} onClose={() => setSuggestion(null)} />}
            {voiceSheet && (
              <VoiceInputSheet T={T} primary={primary} secondary={secondary} recipe={recipe}
                source={voiceSheet.source} liveText={liveTranscript}
                sttSupported={sttSupported} sttError={sttError}
                sttBackend={!!(voiceCaps && voiceCaps.sarvam)}
                onSubmit={(phrase) => processVoicePhrase(phrase, voiceSheet.source)}
                onTranscribe={async (blob) => {
                  const src = voiceSheet.source;
                  const text = await transcribe(blob, { language: t.language });
                  if (text && text.trim()) processVoicePhrase(text.trim(), src);
                  else setToast('Couldn’t transcribe that — try again or type.');
                }}
                onClose={() => { stopVoiceCapture(); setVstate(s => s === 'listening' ? 'idle' : s); }} />
            )}
            <Toast T={T} msg={toast} />
          </div>
        </IOSDevice>
      </div>

      {/* floating settings button */}
      <button onClick={() => setShowTweaks(v => !v)} aria-label="Settings" title="Settings"
        style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 2147483645, width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', background: primary, color: T.onPrimary, fontSize: 20, boxShadow: '0 6px 18px rgba(0,0,0,.25)', display: showTweaks ? 'none' : 'grid', placeItems: 'center' }}>⚙︎</button>

      <TweaksPanel open={showTweaks} onClose={() => setShowTweaks(false)}>
        <TweakSection label="Companion" />
        <TweakRadio label="Default persona" value={t.persona} options={['amma', 'chef', 'friend']}
          onChange={(v) => setTweak('persona', v)} />
        <TweakToggle label="Voice readout (TTS)" value={t.sound} onChange={(v) => setTweak('sound', v)} />
        <TweakSelect label="Voice language" value={t.language}
          options={LANGUAGES} onChange={(v) => setTweak('language', v)} />
        <TweakSection label="Palette" />
        <TweakColor label="Primary (terracotta)" value={t.primary}
          options={['#C9542B', '#B5431F', '#D2603A', '#A8431F', '#C2410C']} onChange={(v) => setTweak('primary', v)} />
        <TweakColor label="Secondary (sage)" value={t.secondary}
          options={['#5B7553', '#6B8E5A', '#4D6B57', '#7A8B5F', '#9C7A3C']} onChange={(v) => setTweak('secondary', v)} />
        <TweakToggle label="Dark mode (Evening Hearth)" value={t.dark} onChange={(v) => setTweak('dark', v)} />
        <TweakSection label="Type" />
        <TweakSelect label="Heading font" value={t.headFont}
          options={['Sora', 'Space Grotesk', 'Bricolage Grotesque', 'Hanken Grotesk']} onChange={(v) => setTweak('headFont', v)} />
      </TweaksPanel>
    </div>
  );
}
