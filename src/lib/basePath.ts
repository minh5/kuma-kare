const rawBase = import.meta.env.VITE_BASE_PATH || '/';
// Normalized base path with no trailing slash. Empty string for root.
export const BASE_PATH: string =
  rawBase === '/' ? '' : rawBase.replace(/\/+$/, '');

export function withBase(path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return BASE_PATH + path;
}
