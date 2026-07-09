import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In `vite preview`, prevent the SPA history fallback from swallowing
// `/api/*` routes. In production those are owned by the Cloudflare Worker; the
// browser should keep the navigated URL (and show a 404) rather than load the
// SPA and get redirected by the catch-all route.
function noSpaFallbackForApi() {
  return {
    name: 'no-spa-fallback-for-api',
    configurePreviewServer(server: { middlewares: { use: (m: unknown) => void } }) {
      server.middlewares.use(
        (req: { url: string }, res: { statusCode: number; end: (b?: string) => void }, next: () => void) => {
          const url = req.url ?? '';
          if (url.split('?')[0].startsWith('/api/')) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          next();
        },
      );
    },
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss(), noSpaFallbackForApi()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
