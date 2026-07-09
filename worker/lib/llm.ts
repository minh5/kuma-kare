export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20241022';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Anthropic API error: ${res.status} ${res.statusText}`,
      );
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    const text = data.content?.map((b) => b.text ?? '').join('') ?? '';
    return text;
  }
}

// Stub providers reserved for future migration. Not wired in V1.
export class BasetenProvider implements LLMProvider {
  async chat(_messages: ChatMessage[], _systemPrompt: string): Promise<string> {
    throw new Error('BasetenProvider not implemented');
  }
}

export class TEEProvider implements LLMProvider {
  async chat(_messages: ChatMessage[], _systemPrompt: string): Promise<string> {
    throw new Error('TEEProvider not implemented');
  }
}
