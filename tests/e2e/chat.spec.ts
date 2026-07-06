import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('displays chat input area', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeVisible();
  });

  test('displays send button', async ({ page }) => {
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeVisible();
  });

  test('can type message in input', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('How do I feed the cat?');
    await expect(input).toHaveValue('How do I feed the cat?');
  });

  test('displays user message after sending', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Feed twice daily.' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('How do I feed the cat?');
    await page.locator('[data-testid="send-button"]').click();

    const userMessage = page.locator('[data-testid="message-user"]').first();
    await expect(userMessage).toContainText('How do I feed the cat?');
  });

  test('displays assistant response after API call', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Feed the cat twice daily with wet food.' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('How do I feed the cat?');
    await page.locator('[data-testid="send-button"]').click();

    const assistantMessage = page.locator('[data-testid="message-assistant"]').first();
    await expect(assistantMessage).toContainText('Feed the cat twice daily');
  });

  test('clears input after sending', async ({ page }) => {
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Response' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Test message');
    await page.locator('[data-testid="send-button"]').click();

    await expect(input).toHaveValue('');
  });
});

test.describe('YouTube Video Embedding', () => {
  test('renders YouTube video as iframe when URL in response', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Watch this video for litter instructions: https://youtu.be/dQw4w9WgXcQ' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('How to clean litter?');
    await page.locator('[data-testid="send-button"]').click();

    const iframe = page.locator('iframe[data-testid="video-embed"]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com/);
    await expect(iframe).toHaveAttribute('src', /dQw4w9WgXcQ/);
  });

  test('uses youtube-nocookie.com domain for privacy', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Video: https://youtube.com/watch?v=abc123def45' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Show video');
    await page.locator('[data-testid="send-button"]').click();

    const iframe = page.locator('iframe[data-testid="video-embed"]');
    await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/abc123def45/);
  });
});

test.describe('Ephemeral State', () => {
  test('chat history is cleared on page refresh', async ({ page }) => {
    await page.goto('/chat');
    
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ response: 'Test response' })
      });
    });

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Test message');
    await page.locator('[data-testid="send-button"]').click();
    
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();

    await page.reload();

    await expect(page.locator('[data-testid="message-user"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="message-assistant"]')).toHaveCount(0);
  });
});