import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  root: './',
  plugins: [
    // Generate an ES5 + polyfilled bundle for old engines (Telegram Desktop
    // on Windows uses a legacy EdgeHTML/Chakra WebView that can't run modern JS).
    legacy({
      targets: ['chrome >= 64', 'edge >= 18', 'safari >= 11', 'ie >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: true
    })
  ],
  server: {
    port: 5173,
    host: true, // Listen on all network addresses (helpful for testing on mobile via local IP)
    proxy: {
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../dist', // Output to a shared folder if needed, or default to dist
    emptyOutDir: true,
    // Target older browser engines so the bundle runs in desktop Telegram's
    // (sometimes dated) WebView. Avoids top-level features that break there.
    target: ['es2018', 'chrome70', 'safari12'],
    cssTarget: 'chrome70'
  }
});
