# CookCircle

A voice-first, multilingual AI **cooking companion** — built in React from the
[Claude Design](https://claude.ai/design) *CookCircle Prototype* handoff.

CookCircle walks you through a recipe step by step. It speaks each step aloud,
then **automatically listens** for your next command. You can drive the whole
session by voice, by typing, or with on-screen buttons — every input flows
through one shared **intent pipeline**, so "go back to the grinding step",
"repeat that", "step 3" and the Next/Back buttons all do the right thing.

## Features

- **Home** — big mic, type-to-search fallback, recent recipes, add-a-recipe.
- **Persona companions** — Amma (warm), Chef (precise), Friend (casual). The
  persona changes the tone and the spoken voice (rate/pitch).
- **Recipe Detail** — ingredients (qty · unit · item) with tap-to-reveal
  **ingredient substitutes**, plus a **nutrition** card (calories, protein /
  fat / carbs, and a carbohydrate breakdown of complex / sugars / fiber).
- **Cooking session** — animated voice visualizers (pulsing mic + audio
  waveform while listening; radiating speaker rings + word-by-word progressive
  highlight while speaking) and a persistent **conversation log** per run.
- **Shared intent pipeline** (`detectIntent`) — numeric / ordinal / tag-based
  step jumps, next / repeat / skip / back / done, and Q&A fallback. Real
  Web Speech API speech-to-text where the browser allows it, with a typed /
  quick-command fallback everywhere else.
- **Add a recipe** — emoji, name, serves, ingredients (with optional
  alternates), steps, tips and nutrition. Saved recipes are immediately
  searchable and cookable; step tags are auto-derived for voice navigation.
- **Profile → Analytics & History** — every run is recorded to `localStorage`.
  Business analytics over 7d / 30d / 90d / All / custom ranges: cook sessions,
  cook time, **calories per head**, **average nutrition per head**, **ingredient
  consumption** (total + avg/head), top recipes and personas. History tab lists
  every session with its full conversation transcript.
- **Settings** — a live panel (⚙︎, bottom-right) to switch the default persona,
  toggle voice readout, tune the terracotta / sage palette, flip to the
  **Evening Hearth** dark mode, and change the heading font. Preferences persist.

The visual system is **Kitchen Daylight** (warm cream + terracotta + sage,
espresso text) with **Evening Hearth** shipped as a dark variant from the same
token set. The UI is presented inside an iOS-style device frame.

## Tech

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/)
- No CSS framework — design tokens live in `src/theme.js`; voice-state
  keyframes in `src/index.css`.
- App state + run history persist via React hooks and `localStorage`.
- A tiny dependency-free Node proxy (`server/`, Node built-ins only) holds the
  ElevenLabs / Sarvam keys and exposes `/api/tts`, `/api/stt`, `/api/health`;
  mounted into Vite in dev and run standalone in production.

## Getting started

```bash
npm install
npm run dev      # dev server (Vite) — includes the voice API at /api/*
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run serve    # standalone server: serves dist/ + the voice API
npm run start    # build, then serve
```

Then open the printed local URL.

## Voice: ElevenLabs + Sarvam (optional)

CookCircle can speak and listen through real cloud voices, with the browser's
built-in speech as an automatic fallback:

- **ElevenLabs** — high-quality multilingual **text-to-speech**.
- **Sarvam** — Indian-language **text-to-speech and speech-to-text**.

Keys are held **server-side** and proxied through `/api/*` (so they never reach
the browser bundle). To enable, copy `.env.example` → `.env` and fill in:

```bash
cp .env.example .env
# ELEVENLABS_API_KEY=...   SARVAM_API_KEY=...
npm run dev
```

The app probes `/api/health` on load:

- **Step readout (TTS):** uses Sarvam for Indian languages and ElevenLabs
  otherwise; if neither key is set (or a request fails) it falls back to the
  browser's `speechSynthesis`.
- **Voice commands (STT):** the live Web Speech API path is used where the
  browser supports it; when a Sarvam key is present, the voice sheet also offers
  **🎙 Record & transcribe (AI)** (records via `MediaRecorder`, transcribes via
  Sarvam). Either way the text routes through the same `detectIntent` pipeline.
- **Voice language** is selectable in Settings (English + several Indian
  languages) and drives both TTS and STT.

> Without keys, everything still works on browser speech (best in Chrome /
> Edge; audio only starts after your first tap, per browser autoplay rules).
> The same keys are referenced by the registered `elevenlabs` / `sarvam` MCP
> servers via `${ELEVENLABS_API_KEY}` / `${SARVAM_API_KEY}`.

## Project structure

```
index.html              # Vite entry + Google Fonts
.env.example            # voice API keys (copy to .env)
server/
  voiceHandlers.js     # /api/tts, /api/stt, /api/health → ElevenLabs / Sarvam
  index.js             # standalone server: serves dist/ + the voice API
vite.config.js          # React plugin + voice API dev/preview middleware
src/
  main.jsx             # React root
  index.css            # global styles + voice-state keyframes
  theme.js             # color helpers + Kitchen Daylight / Evening Hearth tokens
  data.js              # recipes, personas, detectIntent intent pipeline
  history.js           # run records + analytics computations + seed data
  voiceService.js      # client wrapper for the voice proxy (capabilities/TTS/STT)
  App.jsx              # screens, overlays, voice + run orchestration
  components/
    iosframe.jsx       # iOS device frame
    voice.jsx          # WaveBars, SpeakerRings, mic/speaker capture visuals
    profile.jsx        # Profile (Analytics + History) + RunDetail
    tweaks.jsx         # in-app Settings panel + form controls
```
