import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { voiceApiMiddleware } from './server/voiceHandlers.js';

// Mounts the voice proxy (/api/tts, /api/stt, /api/health) into the dev and
// preview servers so `npm run dev` works as a single process. The handlers read
// keys from process.env, which we populate from .env via loadEnv below — these
// keys stay server-side and are never bundled into the client.
function voiceApi() {
  return {
    name: 'cookcircle-voice-api',
    configureServer(server) { server.middlewares.use(voiceApiMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(voiceApiMiddleware); },
  };
}

export default defineConfig(({ mode }) => {
  // load ALL vars (empty prefix) from .env files for server-side use
  const env = loadEnv(mode, process.cwd(), '');
  for (const k of ['ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'SARVAM_API_KEY']) {
    if (!process.env[k] && env[k]) process.env[k] = env[k];
  }
  return {
    plugins: [react(), voiceApi()],
  };
});
