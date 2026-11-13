import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/**
 * Content-Security-Policy nur im Build (der Dev-Server braucht Inline-Skripte für HMR/React-Refresh).
 * Die Hashes der Inline-Skripte in index.html (Theme-Vorbelegung) werden hier berechnet.
 */
function csp(): Plugin {
  const frames = ['https://www.youtube-nocookie.com', 'https://www.youtube.com', 'https://player.vimeo.com', 'https://open.spotify.com'];
  return {
    name: 'mitschrift-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`);
        const policy = [
          "default-src 'self'",
          // 'wasm-unsafe-eval': WebAssembly (Bild-Verkleinerung, Excalidraw-Schriften-Subsetting). Kein 'unsafe-eval'.
          `script-src 'self' ${hashes.join(' ')} 'wasm-unsafe-eval'`,
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "media-src 'self' data: blob: https:",
          "font-src 'self' data: blob:",
          "connect-src 'self' data: blob: https:",
          `frame-src ${frames.join(' ')}`,
          "worker-src 'self' blob: data:",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ');
        return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`);
      },
    },
  };
}

/**
 * Excalidraw-Schriften selbst ausliefern (unter /excalidraw-assets/fonts/), statt sie zur Laufzeit von esm.sh zu holen:
 * kein Drittanbieter, und per Service-Worker-Cache auch offline. Die große CJK-Schrift (Xiaolai, ~12 MB) bleibt weg.
 */
function excalidrawFonts(base = '/'): Plugin {
  const dir = join(process.cwd(), 'node_modules/@excalidraw/excalidraw/dist/prod/fonts');
  const prefix = '/excalidraw-assets/fonts/';
  const skip = (rel: string) => rel.startsWith('Xiaolai');
  const walk = (d: string, base = ''): string[] =>
    readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n), `${base}${n}/`) : [`${base}${n}`]));
  return {
    name: 'mitschrift-excalidraw-fonts',
    configureServer(server) {
      server.middlewares.use(prefix, (req, res, next) => {
        const rel = normalize(decodeURIComponent((req.url ?? '').split('?')[0])).replace(/^[/\\]+/, '');
        const file = join(dir, rel);
        if (rel.startsWith('..') || skip(rel) || !file.endsWith('.woff2') || !existsSync(file)) return next();
        res.setHeader('Content-Type', 'font/woff2');
        res.end(readFileSync(file));
      });
    },
    // Excalidraw hängt jeder Schrift esm.sh als Ausweich-Quelle an. Unter der CSP meldet Chrome dafür
    // je Schrift einen Verstoß (auch wenn die eigene Datei lädt) – im Build stattdessen auf den eigenen Ordner zeigen.
    transform(code, id) {
      if (!id.includes('@excalidraw/excalidraw') || !code.includes('ASSETS_FALLBACK_URL')) return null;
      const next = code.replace(
        /("ASSETS_FALLBACK_URL",\s*)`https:\/\/esm\.sh\/.*?\/dist\/prod\/`/,
        (_, head: string) => `${head}(window.location.origin + ${JSON.stringify(`${base}excalidraw-assets/`)})`,
      );
      return next === code ? null : { code: next, map: null };
    },
    generateBundle() {
      for (const rel of walk(dir)) {
        if (skip(rel) || !rel.endsWith('.woff2')) continue;
        this.emitFile({ type: 'asset', fileName: `excalidraw-assets/fonts/${rel}`, source: readFileSync(join(dir, rel)) });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    csp(),
    excalidrawFonts(),
    // Installierbar + offline: Manifest und ein Service Worker, der die komplette App vorab cacht.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Mitschrift',
        short_name: 'Mitschrift',
        description: 'Notizen mit Lern-Blöcken – Karteikarten, Quiz und Lückentext direkt im Text.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#5B5BD6',
        background_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // woff2 reicht (alle PWA-fähigen Browser) – KaTeX liefert zusätzlich woff/ttf, die nie geladen würden.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Große, selten gebrauchte Lazy-Chunks und die Excalidraw-Schriften nicht vorab cachen,
        // sondern beim ersten Gebrauch (runtimeCaching unten). Alles andere läuft offline sofort.
        globIgnores: ['**/excalidraw-assets/**', '**/assets/elk-*.js', '**/assets/cynefin*.js', '**/assets/subset-*.js'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Mermaid-Layout (ELK), Cynefin-Diagramm, Excalidraw-Schriften-Subsetting – nach dem ersten Laden offline da.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/assets\/(elk|cynefin|subset-)/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lazy-chunks', expiration: { maxEntries: 30 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/excalidraw-assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'excalidraw-fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: Number(process.env.PORT) || 5190 },
});
