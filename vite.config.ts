import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Every asset as a file: the CSP has no data: for media, and the hashed files are cached
    // forever by nginx.
    assetsInlineLimit: 0,
  },
  server: { port: 5173 },
});
