// profile.jsx — Profile screen with run history + business analytics
import { useState, useMemo } from 'react';
import { alpha } from '../theme.js';
import { analyse } from '../history.js';

function fmtDuration(ms) {
  if (!ms) return '—';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mm = m % 60;
  return `${h}h ${mm}m`;
}
function fmtDate(ms) {
  const d = new Date(ms), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yest = new Date(now.getTime() - 86400000);
  if (sameDay) return `Today · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (d.toDateString() === yest.toDateString()) return `Yesterday · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const ACTION_LABEL = { next: 'Next', repeat: 'Repeat', skip: 'Skip', back: 'Back', goto: 'Jump', tip: 'Tip ask', substitute: 'Swap', share: 'Share', done: 'Done', query: 'Q&A' };
const PRESETS = [
  { id: '7', label: '7d', days: 7 },
  { id: '30', label: '30d', days: 30 },
  { id: '90', label: '90d', days: 90 },
  { id: 'all', label: 'All', days: null },
];

export function Profile({ T, primary, secondary, onBack, onOpenRun, history }) {
  const [tab, setTab] = useState('analytics');  // analytics | history
  const [preset, setPreset] = useState('30');
  const [granularity, setGranularity] = useState('day');  // day|week|month
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { from, to } = useMemo(() => {
    if (preset === 'custom') {
      const f = customFrom ? new Date(customFrom).getTime() : 0;
      const t = customTo ? new Date(customTo + 'T23:59:59').getTime() : Date.now();
      return { from: f, to: t };
    }
    const p = PRESETS.find(x => x.id === preset);
    if (!p || !p.days) return { from: 0, to: Date.now() };
    return { from: Date.now() - p.days * 86400000, to: Date.now() };
  }, [preset, customFrom, customTo]);

  const stats = useMemo(() => analyse(history, { from, to, granularity }), [history, from, to, granularity]);

  const headStyle = { fontFamily: "var(--head,'Sora'),sans-serif", letterSpacing: '-.01em' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', height: 48 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: 22, width: 30, textAlign: 'left' }}>←</button>
        <div style={{ ...headStyle, fontWeight: 700, fontSize: 17, color: T.text }}>Your kitchen</div>
        <div style={{ width: 30 }} />
      </div>

      {/* tab pills */}
      <div style={{ display: 'flex', gap: 6, margin: '4px 22px 10px', padding: 4, background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 100 }}>
        {[['history', '📜 History'], ['analytics', '📊 Analytics']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '7px 0', background: tab === id ? primary : 'transparent', color: tab === id ? '#fff' : T.dim, border: 'none', borderRadius: 100, cursor: 'pointer', fontFamily: 'Hanken Grotesk,sans-serif', fontWeight: 700, fontSize: 13 }}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 18px' }}>
        {tab === 'history' && (
          <HistoryView T={T} primary={primary} secondary={secondary} history={history} onOpenRun={onOpenRun} />
        )}
        {tab === 'analytics' && (
          <AnalyticsView T={T} primary={primary} secondary={secondary}
            stats={stats}
            preset={preset} setPreset={setPreset}
            customFrom={customFrom} setCustomFrom={setCustomFrom}
            customTo={customTo} setCustomTo={setCustomTo} />
        )}
      </div>
    </div>
  );
}

function HistoryView({ T, primary, secondary, history, onOpenRun }) {
  if (!history.length) {
    return <div style={{ color: T.dim, fontSize: 14, padding: '30px 0', textAlign: 'center' }}>No cooking sessions yet. Start one from Home.</div>;
  }
  const sorted = [...history].sort((a, b) => b.started - a.started);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {sorted.map(run => (
        <button key={run.id} onClick={() => onOpenRun(run)} style={{ textAlign: 'left', background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', color: T.text, fontFamily: 'Hanken Grotesk,sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 5 }}>
            <span style={{ fontSize: 22 }}>{run.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 700, fontSize: 15, color: T.text, letterSpacing: '-.01em' }}>{run.recipeName}</div>
              <div style={{ fontSize: 11.5, color: T.faint, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.03em' }}>{fmtDate(run.started)} · {run.persona}</div>
            </div>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 100, fontWeight: 700, letterSpacing: '.04em', background: run.completed ? alpha(secondary, .16) : alpha(T.faint, .18), color: run.completed ? secondary : T.dim, fontFamily: 'inherit' }}>
              {run.completed ? 'COMPLETED' : 'PARTIAL'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: T.dim, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.03em' }}>
            <span>⏱ {fmtDuration(run.durationMs)}</span>
            <span>📝 {run.stepsReached}/{run.stepsTotal} steps</span>
            <span>🔁 {run.actions?.length || 0} actions</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function AnalyticsView({ T, primary, secondary, stats, preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }) {
  const labelStyle = { fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint };
  const cardStyle = { background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 14, padding: 12 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* range selector */}
      <div>
        <div style={{ ...labelStyle, marginBottom: 7 }}>Range</div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => setPreset(p.id)} style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${preset === p.id ? primary : T.surfaceBd}`, background: preset === p.id ? primary : 'transparent', color: preset === p.id ? '#fff' : T.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700 }}>{p.label}</button>
          ))}
          <button onClick={() => setPreset('custom')} style={{ padding: '6px 12px', borderRadius: 100, border: `1px solid ${preset === 'custom' ? primary : T.surfaceBd}`, background: preset === 'custom' ? primary : 'transparent', color: preset === 'custom' ? '#fff' : T.dim, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700 }}>Custom…</button>
        </div>
        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.surfaceBd}`, background: T.inputBg, color: T.inputText, fontSize: 13, fontFamily: 'inherit' }} />
            <span style={{ alignSelf: 'center', color: T.faint, fontSize: 12 }}>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.surfaceBd}`, background: T.inputBg, color: T.inputText, fontSize: 13, fontFamily: 'inherit' }} />
          </div>
        )}
      </div>

      {/* KPI grid */}
      {(() => {
        const heads = stats.totals.heads || 0;
        const calPerHead = heads ? Math.round(stats.totals.totalCalories / heads) : 0;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Kpi T={T} color={primary} label="Cook sessions" value={stats.totals.runs} sub={`${stats.totals.completed} completed`} />
            <Kpi T={T} color={secondary} label="Cook time" value={fmtDuration(stats.totals.totalCookMinutes * 60000)} sub={`${stats.totals.completionRate}% finish rate`} />
            <Kpi T={T} color={primary} label="Calories / head" value={calPerHead.toLocaleString()} sub="kcal per person" />
          </div>
        );
      })()}

      {/* nutrition per head */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={labelStyle}>Avg nutrition / head</div>
          <span style={{ fontSize: 11, color: T.faint }}>{stats.nutritionPerHead ? `per person · ${stats.nutritionPerHead.basisRuns} run avg` : 'no data'}</span>
        </div>
        <NutritionPerHead n={stats.nutritionPerHead} T={T} primary={primary} secondary={secondary} />
      </div>

      {/* top recipes */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Top recipes</div>
        <RankList rows={stats.byRecipe.slice(0, 5)} T={T} color={primary} />
      </div>

      {/* ingredient consumption — total + per head */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={labelStyle}>Ingredient consumption</div>
          <span style={{ fontSize: 11, color: T.faint }}>total · avg/head</span>
        </div>
        <ConsumptionList rows={stats.ingredientConsumption.slice(0, 8)} T={T} color={secondary} />
      </div>

      {/* persona breakdown */}
      <div style={cardStyle}>
        <div style={{ ...labelStyle, marginBottom: 10 }}>Personas used</div>
        <RankList rows={stats.byPersona.map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v])} T={T} color={secondary} />
      </div>
    </div>
  );
}

function Kpi({ T, color, label, value, sub }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.surfaceBd}`, borderRadius: 14, padding: '12px 14px' }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 800, fontSize: 23, color: T.text, letterSpacing: '-.02em', lineHeight: 1.05 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.faint, marginTop: 3, letterSpacing: '.02em' }}>{sub}</div>
      <div style={{ height: 2, width: 24, background: color, borderRadius: 100, marginTop: 6, opacity: .7 }} />
    </div>
  );
}

function RankList({ rows, T, color }) {
  if (!rows.length) return <div style={{ color: T.faint, fontSize: 13, padding: '10px 0' }}>No data yet.</div>;
  const max = Math.max(...rows.map(r => r[1]));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(([label, count], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13.5, color: T.text, minWidth: 80, flex: 'none' }}>{label}</div>
          <div style={{ flex: 1, height: 6, background: T.line, borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(4, (count / max) * 100)}%`, height: '100%', background: color, borderRadius: 100 }} />
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: T.dim, minWidth: 24, textAlign: 'right' }}>{count}</div>
        </div>
      ))}
    </div>
  );
}

function ConsumptionList({ rows, T, color }) {
  if (!rows.length) return <div style={{ color: T.faint, fontSize: 13, padding: '10px 0' }}>No completed runs in this range.</div>;
  const max = Math.max(...rows.map(r => r.primaryQty || r.runs || 1));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {rows.map((row, i) => {
        const w = (row.primaryQty || row.runs) / max;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.item}</div>
              <div style={{ height: 5, background: T.line, borderRadius: 100, marginTop: 4, overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(4, w * 100)}%`, height: '100%', background: color, borderRadius: 100 }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none', minWidth: 104 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, color: T.text, fontWeight: 600 }}>{row.display}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: color, letterSpacing: '.02em', opacity: .85 }}>{row.perHeadDisplay || ''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NutritionPerHead({ n, T, primary, secondary }) {
  if (!n) return <div style={{ color: T.faint, fontSize: 13, padding: '10px 0' }}>No completed runs with nutrition in this range.</div>;
  const macros = [
    { label: 'Calories', value: n.calories, unit: 'kcal', color: primary, big: true },
    { label: 'Protein', value: n.protein_g, unit: 'g', color: secondary },
    { label: 'Fat', value: n.fat_g, unit: 'g', color: primary },
    { label: 'Carbs', value: n.carbs_g, unit: 'g', color: secondary },
  ];
  // carbs composition bar
  const c = Math.max(0.0001, n.carbs_g);
  const segs = [
    { label: 'Complex', v: n.complex_g, color: secondary },
    { label: 'Sugar', v: n.sugar_g, color: primary },
    { label: 'Fiber', v: n.fiber_g, color: alpha(secondary, .5) },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {macros.map((m, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "var(--head,'Sora'),sans-serif", fontWeight: 800, fontSize: m.big ? 21 : 18, color: T.text, letterSpacing: '-.02em', lineHeight: 1.05 }}>{m.value}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: T.faint, letterSpacing: '.04em' }}>{m.unit}</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{m.label}</div>
            <div style={{ height: 2, width: 20, background: m.color, borderRadius: 100, margin: '5px auto 0', opacity: .7 }} />
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 6 }}>Carbohydrate breakdown</div>
      <div style={{ display: 'flex', height: 9, borderRadius: 100, overflow: 'hidden', marginBottom: 8, background: T.line }}>
        {segs.map((s, i) => (
          <div key={i} title={`${s.label}: ${s.v} g`} style={{ width: `${(s.v / c) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.dim }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flex: 'none' }} />
            {s.label} <b style={{ color: T.text, fontWeight: 600 }}>{s.v} g</b>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── single-run detail view (conversation transcript) ──────────────
export function RunDetail({ T, primary, secondary, run, onBack }) {
  const headStyle = { fontFamily: "var(--head,'Sora'),sans-serif", letterSpacing: '-.01em' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', height: 48 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text, fontSize: 22, width: 30, textAlign: 'left' }}>←</button>
        <div style={{ ...headStyle, fontWeight: 700, fontSize: 17, color: T.text }}>{run.emoji} {run.recipeName}</div>
        <div style={{ width: 30 }} />
      </div>
      <div style={{ padding: '4px 22px 0', display: 'flex', gap: 12, fontSize: 12, color: T.dim, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.03em', marginBottom: 12 }}>
        <span>{fmtDate(run.started)}</span>
        <span>·</span>
        <span>{fmtDuration(run.durationMs)}</span>
        <span>·</span>
        <span>{run.stepsReached}/{run.stepsTotal} steps</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 18px' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint, marginBottom: 10 }}>Conversation</div>
        {(!run.conversation || !run.conversation.length) ? (
          <div style={{ color: T.faint, fontSize: 13, padding: '10px 0' }}>No transcript captured for this session.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {run.conversation.map((turn, i) => (
              <ConvBubble key={i} turn={turn} T={T} primary={primary} secondary={secondary} />
            ))}
          </div>
        )}
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, letterSpacing: '.12em', textTransform: 'uppercase', color: T.faint, margin: '18px 0 10px' }}>Actions</div>
        <RankList rows={Object.entries((run.actions || []).reduce((m, a) => (m[a.kind] = (m[a.kind] || 0) + 1, m), {})).map(([k, v]) => [ACTION_LABEL[k] || k, v])} T={T} color={primary} />
      </div>
    </div>
  );
}

function ConvBubble({ turn, T, primary }) {
  const isUser = turn.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div style={{ maxWidth: '82%', padding: '9px 12px', borderRadius: 14, borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4, background: isUser ? primary : T.surface, color: isUser ? '#fff' : T.text, border: isUser ? 'none' : `1px solid ${T.surfaceBd}`, fontSize: 13.5, lineHeight: 1.4 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .6, marginBottom: 3 }}>
          {isUser ? 'You' : 'CookCircle'}
        </div>
        {turn.text}
      </div>
    </div>
  );
}
