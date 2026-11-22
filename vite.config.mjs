import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);

// In development the Express app from server.js answers the live routes
// (/api/*, /status.svg, /terminal.svg) on the same port as Vite.
function expressApi() {
  return {
    name: 'express-api',
    configureServer(server) {
      const { app, startChecks } = require('./server.js');
      startChecks();
      server.middlewares.use((req, res, next) => {
        if (/^\/(api\/|status\.svg|terminal\.svg)/.test(req.url)) return app(req, res, next);
        next();
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [expressApi()],
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    chunkSizeWarningLimit: 700, // the lazy Three.js chunk
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        ar: resolve(import.meta.dirname, 'ar/index.html'),
      },
    },
  },
  server: { port: 3000, strictPort: true },

  preview: { port: 3000 },
});
