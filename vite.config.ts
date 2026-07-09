import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleRequest, type Env } from './worker/index';

// BASE_PATH controls where the built assets are served from.
// It can be overridden at build time via VITE_BASE_PATH, e.g.
//   VITE_BASE_PATH=/kuma npm run build
const basePath = process.env.VITE_BASE_PATH ?? '/';

function readDevVars(): Record<string, string> {
  // Minimal .dev.vars parser: KEY=VALUE lines, ignores blanks/comments.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    const path = require('node:path');
    const file = path.resolve(process.cwd(), '.dev.vars');
    if (!fs.existsSync(file)) return {};
    const text = fs.readFileSync(file, 'utf-8');
    const out: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Vite dev plugin that forwards /api/* requests to the Cloudflare Worker
 * fetch handler so the frontend and worker run together in development.
 */
function workerApiPlugin(): Plugin {
  const env: Env = {
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key-at-least-32-bytes-long-xx',
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS || 'caretaker@example.com',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
    ...readDevVars(),
  };

  return {
    name: 'kuma-worker-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }
        try {
          const base = `http://${req.headers.host || 'localhost:5173'}`;
          const request = new Request(new URL(url, base), {
            method: req.method || 'GET',
            headers: (req.headers as unknown) as HeadersInit,
            body:
              req.method && !['GET', 'HEAD'].includes(req.method)
                ? (req as unknown as ReadableStream)
                : undefined,
            // @ts-expect-error duplex is supported by undici/Node
            duplex: 'half',
          });
          const response = await handleRequest(request, env);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });
          if (response.body) {
            const reader = response.body.getReader();
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          }
          res.end();
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss(), workerApiPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
