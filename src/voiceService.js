// voiceService.js — client wrapper around the server-side voice proxy
// (/api/tts, /api/stt, /api/health). Falls back gracefully (returns null) when
// the backend or a provider isn't available, so callers can use browser speech.

let _capsPromise = null;

// { elevenlabs: boolean, sarvam: boolean } — memoized for the session
export function getCapabilities() {
  if (!_capsPromise) {
    _capsPromise = fetch('/api/health')
      .then((r) => (r.ok ? r.json() : { elevenlabs: false, sarvam: false }))
      .catch(() => ({ elevenlabs: false, sarvam: false }));
  }
  return _capsPromise;
}

// Returns an object URL for the synthesized audio, or null if unavailable.
export async function synthesize(text, { language = 'en-IN', provider } = {}) {
  try {
    const r = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language, provider }),
    });
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  } catch (e) {
    return null;
  }
}

// Transcribe a recorded audio Blob via Sarvam STT. Returns the text, or null.
export async function transcribe(blob, { language = 'en-IN' } = {}) {
  try {
    const audio = await blobToBase64(blob);
    const r = await fetch('/api/stt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, mimeType: blob.type, language }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j && j.transcript) || '';
  } catch (e) {
    return null;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
