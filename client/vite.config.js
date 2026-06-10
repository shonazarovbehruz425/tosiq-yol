import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
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
