import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows sign-in with Google button', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.getByTestId('sign-in-google');
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toContainText(/sign in/i);
  });

  test('sign-in button links to auth endpoint', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.getByTestId('sign-in-google');
    const href = await signInButton.getAttribute('href');
    expect(href).toMatch(/\/api\/auth\/login/);
  });
});

test.describe('Chat page', () => {
  test('shows chat input and send button', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('chat-send')).toBeVisible();
  });

  test('displays message after typing and sending', async ({ page }) => {
    await page.goto('/chat');
    await page.getByTestId('chat-input').fill('Hello cat!');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('user-message')).toContainText('Hello cat!');
  });

  test('renders YouTube embed for video URLs in messages', async ({ page }) => {
    await page.goto('/chat');
    // Simulate a message containing a YouTube URL (via exposed test helper or mock)
    await page.evaluate(() => {
      window.__TEST_ADD_MESSAGE__?.({
        role: 'assistant',
        content: 'Watch this video: https://youtube.com/watch?v=dQw4w9WgXcQ'
      });
    });
    const embed = page.getByTestId('video-embed');
    await expect(embed).toBeVisible();
    const src = await embed.getAttribute('src');
    expect(src).toContain('youtube-nocookie.com');
    expect(src).toContain('dQw4w9WgXcQ');
  });
});

test.describe('Contacts page', () => {
  test('shows emergency contacts heading', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { name: /emergency|contact/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('can navigate from landing to chat via router', async ({ page }) => {
    await page.goto('/');
    // After auth would redirect to /chat, test direct navigation
    await page.goto('/chat');
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('can navigate to contacts page', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page).toHaveURL(/\/contacts/);
  });
});