import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The server (high score API) runs on this port during development (npm run dev:api).
const apiPort = process.env.PORT ?? '3000';

export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Every asset as a file: the CSP has no data: for media, and the hashed files are cached
    // forever by the server.
    assetsInlineLimit: 0,
  },
  server: { port: 5173, proxy: { '/api': `http://127.0.0.1:${apiPort}` } },
});
