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
- State + persistence via React hooks and `localStorage` (no backend).

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build → dist/
npm run preview  # preview the production build
```

Then open the printed local URL.

> **Speech notes.** Spoken steps use the browser's built-in
> `speechSynthesis`, and live speech-to-text uses the Web Speech API — both
> are best supported in Chrome / Edge and only start after your first tap
> (a browser autoplay rule). Where STT isn't available, the voice sheet falls
> back to quick-command chips and free text, which feed the same intent
> pipeline, so no functionality is lost.

## Project structure

```
index.html              # Vite entry + Google Fonts
src/
  main.jsx              # React root
  index.css            # global styles + voice-state keyframes
  theme.js             # color helpers + Kitchen Daylight / Evening Hearth tokens
  data.js              # recipes, personas, detectIntent intent pipeline
  history.js           # run records + analytics computations + seed data
  App.jsx              # screens, overlays, voice + run orchestration
  components/
    iosframe.jsx       # iOS device frame
    voice.jsx          # WaveBars, SpeakerRings, mic/speaker capture visuals
    profile.jsx        # Profile (Analytics + History) + RunDetail
    tweaks.jsx         # in-app Settings panel + form controls
```
