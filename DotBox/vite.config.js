import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',   // relative paths so iframe can load assets from /dotbox/
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2020', 'chrome80', 'safari14'],
  },
});
