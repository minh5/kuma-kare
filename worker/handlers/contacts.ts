import type { Env, JwtPayload } from '../types';
import { getEmergencyContacts } from '../lib/careGuide';
import { isEmailAllowed } from '../middleware/verifyAuth';

export async function handleContacts(
  _request: Request,
  env: Env,
  auth: JwtPayload,
): Promise<Response> {
  if (!isEmailAllowed(auth.email, env)) {
    return json({ error: 'Your email is not on the caretaker allowlist.' }, 403);
  }
  const content = getEmergencyContacts();
  return json({ content }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
