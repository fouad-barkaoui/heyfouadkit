/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Emits /sw.js with the exact list of files this build produced, so the
 * service worker can cache the whole app for offline use. The version is a
 * hash of that list — a new deploy means a new worker, old caches retired.
 */
function serviceWorker(): Plugin {
  return {
    name: 'heyfouad-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const built = Object.keys(bundle)
        .filter((f) => !f.endsWith('.map') && f !== 'sw.js')
        .map((f) => `/${f}`);
      const publicDir = fileURLToPath(new URL('./public', import.meta.url));
      const statics = readdirSync(publicDir)
        .filter((f) => f !== 'avatar-256.png')
        .map((f) => `/${f}`);
      const precache = ['/', ...built, ...statics];
      const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 12);
      const template = readFileSync(fileURLToPath(new URL('./scripts/sw.template.js', import.meta.url)), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          editor: ['@tiptap/react', '@tiptap/starter-kit'],
          pdf: ['pdfjs-dist'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
