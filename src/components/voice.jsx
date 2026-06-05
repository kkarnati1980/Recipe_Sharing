// voice.jsx — animated voice visualizer: mic + waveform (listening), speaker + waves (speaking)
import { useEffect, useState } from 'react';
import { alpha } from '../theme.js';

// ── animated audio-sample bars (fake but visually convincing) ─────────
export function WaveBars({ active, color, bars = 18, height = 32 }) {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeed(s => s + 1), 95);
    return () => clearInterval(id);
  }, [active]);
  // deterministic but lively heights per bar/frame
  const heights = Array.from({ length: bars }, (_, i) => {
    if (!active) return 0.2;
    const t = seed * 0.6 + i * 0.7;
    // mix of sines for a natural feel
    const v = 0.45 + 0.35 * Math.sin(t) + 0.20 * Math.sin(t * 1.7 + i);
    // envelope - taller in middle, smaller at edges
    const env = 1 - Math.pow((i - (bars - 1) / 2) / ((bars - 1) / 2), 2) * 0.45;
    return Math.max(0.10, Math.min(1, v * env));
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height }}>
      {heights.map((h, i) => (
        <span key={i} style={{
          width: 3, borderRadius: 100,
          height: `${h * 100}%`,
          minHeight: 4,
          background: color,
          opacity: active ? (0.55 + h * 0.45) : 0.35,
          transition: active ? 'height .09s cubic-bezier(.4,0,.2,1)' : 'height .25s',
        }} />
      ))}
    </div>
  );
}

// ── radiating speaker rings ──────────────────────────────────────────
export function SpeakerRings({ active, color, size = 64 }) {
  // CSS-only pulsing rings; emoji speaker centered
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      {active && [0, 1, 2].map(i => (
        <span key={i} className="cc-spkring" style={{
          position: 'absolute', inset: 0,
          border: `2px solid ${color}`,
          borderRadius: '50%',
          animation: `cc-ring-pulse 1.4s ease-out ${i * 0.45}s infinite`,
          opacity: 0,
        }} />
      ))}
      <span style={{
        width: size * 0.6, height: size * 0.6, borderRadius: '50%',
        background: active ? color : 'transparent',
        border: active ? 'none' : `2px solid ${color}`,
        color: active ? '#fff' : color,
        fontSize: size * 0.32,
        display: 'grid', placeItems: 'center',
        transition: '.2s',
      }}>🔊</span>
    </div>
  );
}

// ── mic capture visual: mic icon + waveform + transcript ────────────
export function MicCapture({ primary, T, transcript, listening }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: T.surface, border: `1.5px solid ${listening ? primary : T.surfaceBd}`, borderRadius: 18, padding: '12px 14px', boxShadow: listening ? `0 0 0 4px ${alpha(primary, .12)}` : 'none', transition: '.2s' }}>
      <div className={listening ? 'cc-pulse' : ''} style={{
        ['--cc-ring']: alpha(primary, .35),
        width: 42, height: 42, borderRadius: '50%',
        background: primary, color: '#fff',
        display: 'grid', placeItems: 'center',
        fontSize: 18, flex: 'none',
      }}>🎤</div>
      <WaveBars active={listening} color={primary} bars={14} height={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: listening ? primary : T.faint, marginBottom: 2 }}>
          {listening ? 'Listening…' : 'Ready'}
        </div>
        <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {transcript ? <em style={{ fontStyle: 'italic' }}>“{transcript}”</em> : <span style={{ color: T.faint }}>…</span>}
        </div>
      </div>
    </div>
  );
}

// ── speaker capture visual: speaker + sound waves + current text + progressive highlight ─
export function SpeakerCapture({ secondary, T, text, speaking, progress }) {
  // split text into words; highlight up to progress*words count
  const words = (text || '').split(/(\s+)/);
  const wordCount = words.filter(w => w.trim()).length || 1;
  const highlighted = Math.min(wordCount, Math.ceil((progress || 0) * wordCount));
  let nonSpaceIdx = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: T.surface, border: `1.5px solid ${speaking ? secondary : T.surfaceBd}`, borderRadius: 18, padding: '12px 14px', boxShadow: speaking ? `0 0 0 4px ${alpha(secondary, .10)}` : 'none', transition: '.2s' }}>
      <div style={{ flex: 'none', marginTop: 2 }}>
        <SpeakerRings active={speaking} color={secondary} size={42} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: speaking ? secondary : T.faint, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          {speaking ? 'Speaking…' : 'Said'}
          {speaking && <WaveBars active color={secondary} bars={8} height={9} />}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.45, color: T.dim }}>
          {words.map((w, i) => {
            if (!w.trim()) return <span key={i}>{w}</span>;
            const idx = nonSpaceIdx++;
            const isHi = idx < highlighted;
            return <span key={i} style={{ color: isHi ? T.text : T.faint, fontWeight: isHi ? 600 : 400, transition: '.15s' }}>{w}</span>;
          })}
        </div>
      </div>
    </div>
  );
}
