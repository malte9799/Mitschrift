import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: GITHUB_PAGES=1 beim Deploy setzt den Unterpfad des Projekts.
  base: process.env.GITHUB_PAGES ? '/Mitschrift/' : '/',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: Number(process.env.PORT) || 5190 },
});
