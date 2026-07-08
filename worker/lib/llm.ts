export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
}

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string = 'claude-haiku-4-5-20241022';
  private endpoint: string = 'https://api.anthropic.com/v1/messages';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        system: systemPrompt,
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter((c: any) => c.type === 'text');
    return textBlocks.map((c: any) => c.text).join('');
  }
}
