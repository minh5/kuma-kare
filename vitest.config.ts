import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Vite plugin: load .md files as string default exports so worker code can
// `import x from '../../data/foo.md'` under vitest. Wrangler handles the same
// import via its `rules = [{ type = "Text" }]` config.
function rawMarkdownPlugin() {
  return {
    name: 'raw-markdown',
    load(id: string) {
      if (id.endsWith('.md')) {
        const content = readFileSync(id, 'utf-8');
        return `export default ${JSON.stringify(content)};`;
      }
      return undefined;
    },
  };
}

export default defineConfig({
  plugins: [react(), rawMarkdownPlugin()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    globals: true,
  },
});
