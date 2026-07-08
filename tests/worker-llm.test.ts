import { describe, it, expect, vi } from 'vitest';
import { AnthropicProvider, type LLMProvider, type ChatMessage } from '../worker/lib/llm';
import { getCareGuide, getEmergencyContacts } from '../worker/lib/careGuide';

describe('LLMProvider interface', () => {
  it('AnthropicProvider implements LLMProvider interface', () => {
    const provider: LLMProvider = new AnthropicProvider('test-api-key');
    expect(typeof provider.chat).toBe('function');
  });
});

describe('AnthropicProvider', () => {
  it('constructs request with correct model and headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hello from Claude!' }]
      })
    });
    global.fetch = mockFetch;

    const provider = new AnthropicProvider('test-api-key');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];
    
    await provider.chat(messages, 'You are a helpful assistant.');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
          'anthropic-version': '2023-06-01'
        })
      })
    );

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.model).toBe('claude-haiku-4-5-20241022');
    expect(callBody.system).toBe('You are a helpful assistant.');
    expect(callBody.messages).toEqual(messages);
  });

  it('returns text content from response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'The cat needs feeding at 8am.' }]
      })
    });

    const provider = new AnthropicProvider('test-key');
    const result = await provider.chat([{ role: 'user', content: 'When to feed?' }], 'Care guide here');
    
    expect(result).toBe('The cat needs feeding at 8am.');
  });

  it('throws on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    const provider = new AnthropicProvider('bad-key');
    await expect(provider.chat([], '')).rejects.toThrow();
  });
});

describe('care guide utilities', () => {
  it('getCareGuide returns non-empty string', () => {
    const guide = getCareGuide();
    expect(typeof guide).toBe('string');
    expect(guide.length).toBeGreaterThan(0);
  });

  it('getCareGuide does not contain phone numbers', () => {
    const guide = getCareGuide();
    // Phone number patterns
    expect(guide).not.toMatch(/\d{3}[-.]?\d{3}[-.]?\d{4}/);
    expect(guide).not.toMatch(/\(\d{3}\)\s*\d{3}[-.]?\d{4}/);
  });

  it('getEmergencyContacts returns non-empty string', () => {
    const contacts = getEmergencyContacts();
    expect(typeof contacts).toBe('string');
    expect(contacts.length).toBeGreaterThan(0);
  });

  it('getEmergencyContacts contains contact information', () => {
    const contacts = getEmergencyContacts();
    // Should have some indication of contact info
    expect(contacts.toLowerCase()).toMatch(/vet|emergency|phone|contact/);
  });
});