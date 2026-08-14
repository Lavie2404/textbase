import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Web app entry lives in src-web/; App.tsx and gameConfig.js stay at repo
// root (that's where the user's original single-file export already
// imports gameConfig.js from — kept as-is to avoid rewriting import paths).
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
});
