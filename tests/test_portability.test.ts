import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const projectRoot = process.cwd();

function buildWithBase(basePath: string): string {
  const dist = `${projectRoot}/dist`;
  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
  execSync(`VITE_BASE_PATH=${basePath} npx vite build`, {
    cwd: projectRoot,
    stdio: 'pipe',
    env: { ...process.env, VITE_BASE_PATH: basePath },
  });
  return readFileSync(`${dist}/index.html`, 'utf-8');
}

describe('Portability: VITE_BASE_PATH drives asset paths', () => {
  it('places assets under /kuma/assets when BASE_PATH=/kuma', () => {
    const html = buildWithBase('/kuma');
    expect(html).toMatch(/src="\/kuma\/assets\//);
    expect(html).toMatch(/href="\/kuma\/assets\//);
    expect(html).not.toMatch(/src="\/assets\//);
    expect(existsSync(`${projectRoot}/dist/assets`)).toBe(true);
  });

  it('places assets under /assets when BASE_PATH=/', () => {
    const html = buildWithBase('/');
    expect(html).toMatch(/src="\/assets\//);
    expect(html).toMatch(/href="\/assets\//);
    expect(html).not.toMatch(/\/kuma\/assets\//);
  });
});
