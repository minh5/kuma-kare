import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider, type LLMProvider, type ChatMessage } from '../worker/lib/llm';
import { loadCareGuide, buildSystemPrompt } from '../worker/lib/careGuide';

describe('LLMProvider interface', () => {
  it('AnthropicProvider implements LLMProvider', () => {
    const provider: LLMProvider = new AnthropicProvider('test-key');
    expect(typeof provider.chat).toBe('function');
  });
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    provider = new AnthropicProvider('test-api-key');
  });

  it('calls Anthropic API with correct headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Hello!' }] })
    });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    await provider.chat(messages, 'You are helpful.');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        })
      })
    );
  });

  it('sends correct model and system prompt', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Response' }] })
    });

    const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
    await provider.chat(messages, 'System prompt here');

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('claude-haiku-4-5-20241022');
    expect(callBody.system).toBe('System prompt here');
    expect(callBody.messages).toEqual(messages);
  });

  it('returns text content from response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'The cat needs food twice daily.' }] })
    });

    const result = await provider.chat([{ role: 'user', content: 'Feeding?' }], 'prompt');
    expect(result).toBe('The cat needs food twice daily.');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(provider.chat([{ role: 'user', content: 'Hi' }], 'prompt'))
      .rejects.toThrow();
  });
});

describe('care guide loading', () => {
  it('loadCareGuide returns non-empty string', () => {
    const guide = loadCareGuide();
    expect(typeof guide).toBe('string');
    expect(guide.length).toBeGreaterThan(0);
  });

  it('buildSystemPrompt includes care guide content', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('care');
    expect(prompt.toLowerCase()).toMatch(/cat|feeding|litter/);
  });

  it('system prompt instructs to defer to contacts page for phone numbers', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/contact|emergency|phone/);
  });
});