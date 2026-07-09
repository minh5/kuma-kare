import type { Env } from '../types';

// Normalized base path: "" for root, "/kuma" (no trailing slash) for subpath.
export function basePath(env: Env): string {
  const raw = env.BASE_PATH ?? '/';
  if (raw === '/' || raw === '') return '';
  return raw.replace(/\/+$/, '');
}

export function joinBase(env: Env, path: string): string {
  if (!path.startsWith('/')) path = '/' + path;
  return basePath(env) + path;
}

export function origin(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

export function redirectUri(env: Env, request: Request): string {
  return origin(request) + joinBase(env, '/api/auth/callback');
}

export interface CookieOptions {
  path: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  maxAge?: number;
}

export function buildCookie(
  name: string,
  value: string,
  opts: CookieOptions,
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join('; ');
}

export function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? '';
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(header);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

export function randomBase64Url(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  const b64 = btoa(String.fromCharCode(...arr));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Append multiple Set-Cookie header values to a Headers object. Each cookie
// must be its own header value (the spec forbids joining them with commas).
export function appendCookies(headers: Headers, cookies: string[]): void {
  for (const c of cookies) headers.append('set-cookie', c);
}
