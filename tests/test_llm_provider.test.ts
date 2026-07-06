import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider, type LLMProvider, type ChatMessage } from '../worker/lib/llm';

describe('LLMProvider', () => {
  describe('AnthropicProvider', () => {
    const apiKey = 'test-api-key';
    let provider: LLMProvider;

    beforeEach(() => {
      provider = new AnthropicProvider(apiKey);
      vi.resetAllMocks();
    });

    it('implements LLMProvider interface', () => {
      expect(typeof provider.chat).toBe('function');
    });

    it('calls Anthropic API with correct headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'Hello!' }] })
      });
      vi.stubGlobal('fetch', mockFetch);

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
      await provider.chat(messages, 'You are a helpful assistant');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          })
        })
      );
    });

    it('sends correct model and system prompt', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'Response' }] })
      });
      vi.stubGlobal('fetch', mockFetch);

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
      const systemPrompt = 'You are a cat care assistant';
      await provider.chat(messages, systemPrompt);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('claude-haiku-4-5-20241022');
      expect(callBody.system).toBe(systemPrompt);
      expect(callBody.messages).toEqual(messages);
    });

    it('returns response text', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [{ text: 'Feed the cat twice daily.' }] })
      });
      vi.stubGlobal('fetch', mockFetch);

      const messages: ChatMessage[] = [{ role: 'user', content: 'How often to feed?' }];
      const response = await provider.chat(messages, 'System prompt');

      expect(response).toBe('Feed the cat twice daily.');
    });

    it('throws error on API failure', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });
      vi.stubGlobal('fetch', mockFetch);

      const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
      await expect(provider.chat(messages, 'System')).rejects.toThrow();
    });
  });
});