import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

describe('build scaffold', () => {
  it('type-checks successfully', () => {
    expect(() => execSync('npx tsc --noEmit', { stdio: 'pipe' })).not.toThrow();
  });

  it('builds with default BASE_PATH', () => {
    execSync('npm run build', { stdio: 'pipe' });
    expect(existsSync('dist/index.html')).toBe(true);
  });

  it('builds with /kuma BASE_PATH and assets at correct path', () => {
    execSync('VITE_BASE_PATH=/kuma npm run build', { stdio: 'pipe' });
    const html = readFileSync('dist/index.html', 'utf-8');
    expect(html).toContain('/kuma/assets/');
  });

  it('builds with / BASE_PATH and assets at root path', () => {
    execSync('VITE_BASE_PATH=/ npm run build', { stdio: 'pipe' });
    const html = readFileSync('dist/index.html', 'utf-8');
    expect(html).toMatch(/src="\/assets\//);
    expect(html).not.toContain('/kuma/');
  });
});