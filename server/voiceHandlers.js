// voiceHandlers.js — framework-agnostic HTTP handlers that proxy to the
// ElevenLabs (TTS) and Sarvam (multilingual TTS + STT) REST APIs.
//
// Keys are read from the server environment and NEVER sent to the browser:
//   ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID (optional), SARVAM_API_KEY
//
// These handlers use only Node built-ins (global fetch / FormData / Blob,
// available in Node 18+), so the proxy needs no extra dependencies. They are
// mounted both by the Vite dev/preview middleware and the standalone server.

const EL_KEY = () => process.env.ELEVENLABS_API_KEY;
const SV_KEY = () => process.env.SARVAM_API_KEY;
const EL_VOICE = () => process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // "Rachel"

export function capabilities() {
  return { elevenlabs: !!EL_KEY(), sarvam: !!SV_KEY() };
}

// ── tiny request/response helpers (raw Node http, works under connect too) ──
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 25 * 1024 * 1024) { reject(new Error('payload too large')); req.destroy(); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
async function readJson(req) { const b = await readBody(req); return b ? JSON.parse(b) : {}; }
function sendJson(res, code, obj) {
  const s = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) });
  res.end(s);
}

// map a BCP-47-ish tag (e.g. "hi-IN", "ta") to a Sarvam language code
function sarvamLang(language) {
  if (!language) return 'en-IN';
  const map = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN', od: 'od-IN', or: 'od-IN' };
  const l = language.toLowerCase().slice(0, 2);
  return map[l] || 'en-IN';
}
function langIsIndian(language) {
  const l = (language || '').toLowerCase().slice(0, 2);
  return ['hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or', 'od', 'as'].includes(l);
}

// ── TTS providers ──────────────────────────────────────────────────────────
async function elevenTts(text) {
  const key = EL_KEY(); if (!key) return null;
  const voice = EL_VOICE();
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  });
  if (!r.ok) return null;
  return { buffer: Buffer.from(await r.arrayBuffer()), contentType: 'audio/mpeg' };
}
async function sarvamTts(text, language) {
  const key = SV_KEY(); if (!key) return null;
  const r = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, target_language_code: sarvamLang(language), speaker: 'anushka', model: 'bulbul:v2' }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  const b64 = j && (Array.isArray(j.audios) ? j.audios[0] : j.audio);
  if (!b64) return null;
  return { buffer: Buffer.from(b64, 'base64'), contentType: 'audio/wav' };
}

export async function ttsHandler(req, res) {
  try {
    const { text, language, provider } = await readJson(req);
    if (!text || !String(text).trim()) return sendJson(res, 400, { error: 'text required' });
    // choose provider order: explicit override, else by language, else by available key
    let order;
    if (provider === 'elevenlabs') order = [elevenTts];
    else if (provider === 'sarvam') order = [(t) => sarvamTts(t, language)];
    else if (langIsIndian(language)) order = [(t) => sarvamTts(t, language), elevenTts];
    else order = [elevenTts, (t) => sarvamTts(t, language)];
    for (const fn of order) {
      const out = await fn(text).catch(() => null);
      if (out && out.buffer && out.buffer.length) {
        res.writeHead(200, { 'Content-Type': out.contentType, 'Content-Length': out.buffer.length, 'Cache-Control': 'no-store' });
        return res.end(out.buffer);
      }
    }
    return sendJson(res, 501, { error: 'no TTS provider available (set ELEVENLABS_API_KEY or SARVAM_API_KEY)' });
  } catch (e) {
    return sendJson(res, 500, { error: String((e && e.message) || e) });
  }
}

// ── STT (Sarvam, multilingual) ──────────────────────────────────────────────
async function sarvamStt(buffer, mimeType, language) {
  const key = SV_KEY(); if (!key) return null;
  const fd = new FormData();
  const ext = mimeType && mimeType.includes('wav') ? 'wav' : mimeType && mimeType.includes('mp3') ? 'mp3' : mimeType && mimeType.includes('ogg') ? 'ogg' : 'webm';
  fd.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), `audio.${ext}`);
  fd.append('model', 'saarika:v2');
  fd.append('language_code', sarvamLang(language));
  const r = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST', headers: { 'api-subscription-key': key }, body: fd,
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j && (j.transcript ?? j.text)) || '';
}

export async function sttHandler(req, res) {
  try {
    const { audio, mimeType, language } = await readJson(req);
    if (!audio) return sendJson(res, 400, { error: 'audio required (base64)' });
    const buf = Buffer.from(audio, 'base64');
    const text = await sarvamStt(buf, mimeType, language);
    if (text == null) return sendJson(res, 501, { error: 'no STT provider available (set SARVAM_API_KEY)' });
    return sendJson(res, 200, { transcript: text });
  } catch (e) {
    return sendJson(res, 500, { error: String((e && e.message) || e) });
  }
}

export function healthHandler(req, res) { sendJson(res, 200, capabilities()); }

// connect/Vite-style middleware that dispatches the three API routes
export function voiceApiMiddleware(req, res, next) {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/health' && req.method === 'GET') return healthHandler(req, res);
  if (url === '/api/tts' && req.method === 'POST') return ttsHandler(req, res);
  if (url === '/api/stt' && req.method === 'POST') return sttHandler(req, res);
  return next();
}
