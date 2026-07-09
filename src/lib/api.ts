const API_BASE = (import.meta.env.VITE_BASE_PATH || '/').replace(/\/+$/, '');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function sendChatMessage(
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (res.status === 401) {
    throw new AuthError('You are not signed in.');
  }
  if (res.status === 403) {
    throw new AuthError('Your email is not on the caretaker allowlist.');
  }
  if (!res.ok) {
    throw new Error(`Chat request failed (${res.status}).`);
  }

  const data = (await res.json()) as { response?: string };
  return data.response ?? '';
}

export async function fetchContacts(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/contacts`, {
    method: 'GET',
    credentials: 'include',
  });
  if (res.status === 401) {
    throw new AuthError('You are not signed in.');
  }
  if (!res.ok) {
    throw new Error(`Contacts request failed (${res.status}).`);
  }
  const data = (await res.json()) as { content?: string };
  return data.content ?? '';
}
