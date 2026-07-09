import type { Env, JwtPayload } from '../types';
import { AnthropicProvider, type ChatMessage } from '../lib/llm';
import { buildSystemPrompt } from '../lib/careGuide';
import { isEmailAllowed } from '../middleware/verifyAuth';

interface ChatRequestBody {
  messages?: ChatMessage[];
}

export async function handleChat(
  request: Request,
  env: Env,
  auth: JwtPayload,
): Promise<Response> {
  if (!isEmailAllowed(auth.email, env)) {
    return json({ error: 'Your email is not on the caretaker allowlist.' }, 403);
  }
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'Anthropic API key is not configured.' }, 500);
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return json({ error: 'messages must be a non-empty array.' }, 400);
  }

  const systemPrompt = buildSystemPrompt();
  const provider = new AnthropicProvider(env.ANTHROPIC_API_KEY);

  try {
    const response = await provider.chat(messages, systemPrompt);
    return json({ response }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM request failed.';
    return json({ error: message }, 502);
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
