/// <reference types="vitest/config" />
import { readFileSync, copyFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const cspDirectives = JSON.parse(readFileSync(new URL('./csp.json', import.meta.url), 'utf8')) as Record<string, string[] | string>;
export const CSP = Object.entries(cspDirectives)
  .filter(([k]) => k !== '//')
  .map(([k, v]) => `${k} ${(v as string[]).join(' ')}`)
  .join('; ');

/** Put the CSP in the built HTML too, so it holds on hosts that can't set headers (e.g. GitHub Pages). */
function cspMeta(): Plugin {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

/** GitHub Pages serves 404.html for unknown paths; make it the app so deep links work. */
function spaFallback(): Plugin {
  return {
    name: 'spa-404',
    apply: 'build',
    closeBundle: () => copyFileSync('dist/index.html', 'dist/404.html'),
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cspMeta(),
    VitePWA({
      registerType: 'autoUpdate',
      // External registerSW.js rather than an inline script, so the strict CSP holds.
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: "So You're In Conflict. Now What?",
        short_name: 'Now What?',
        description: 'The map your therapist uses with you, for the moment you are in it.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f2ea',
        theme_color: '#f7f2ea',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    spaFallback(),
  ],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
});
