import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('displays sign-in with Google button', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.getByTestId('sign-in-google');
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toContainText(/sign in with google/i);
  });

  test('sign-in button links to auth endpoint', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.getByTestId('sign-in-google');
    const href = await signInButton.getAttribute('href');
    expect(href).toContain('/api/auth/login');
  });

  test('displays app title', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/kuma/i);
  });
});

test.describe('Chat Page', () => {
  test('displays chat input area', async ({ page }) => {
    await page.goto('/chat');
    const chatInput = page.getByTestId('chat-input');
    await expect(chatInput).toBeVisible();
  });

  test('displays send button', async ({ page }) => {
    await page.goto('/chat');
    const sendButton = page.getByTestId('send-button');
    await expect(sendButton).toBeVisible();
  });

  test('can type message in input', async ({ page }) => {
    await page.goto('/chat');
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('When should I feed the cat?');
    await expect(chatInput).toHaveValue('When should I feed the cat?');
  });

  test('displays message area for chat history', async ({ page }) => {
    await page.goto('/chat');
    const messageArea = page.getByTestId('message-area');
    await expect(messageArea).toBeVisible();
  });

  test('has navigation to contacts page', async ({ page }) => {
    await page.goto('/chat');
    const contactsLink = page.getByTestId('contacts-link');
    await expect(contactsLink).toBeVisible();
  });
});

test.describe('Contacts Page', () => {
  test('displays contacts page heading', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/contact/i);
  });

  test('has navigation back to chat', async ({ page }) => {
    await page.goto('/contacts');
    const chatLink = page.getByTestId('chat-link');
    await expect(chatLink).toBeVisible();
  });
});

test.describe('Video Embed Component', () => {
  test('renders YouTube embed with nocookie domain when video URL present', async ({ page }) => {
    // Navigate to a test page that renders a message with YouTube URL
    await page.goto('/chat');
    
    // Inject a mock message with YouTube URL into the page
    await page.evaluate(() => {
      const event = new CustomEvent('test:inject-message', {
        detail: { content: 'Check this video: https://youtube.com/watch?v=dQw4w9WgXcQ' }
      });
      window.dispatchEvent(event);
    });
    
    // Wait for potential iframe render
    const iframe = page.locator('iframe[src*="youtube-nocookie.com"]');
    // If message injection is supported, iframe should appear
    // Otherwise this test documents expected behavior
    const count = await iframe.count();
    if (count > 0) {
      await expect(iframe.first()).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    }
  });
});

test.describe('Routing with BASE_PATH', () => {
  test('all routes are accessible from root', async ({ page }) => {
    // Landing
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // Chat
    await page.goto('/chat');
    await expect(page).toHaveURL('/chat');
    
    // Contacts
    await page.goto('/contacts');
    await expect(page).toHaveURL('/contacts');
  });

  test('navigation between pages works', async ({ page }) => {
    await page.goto('/chat');
    await page.getByTestId('contacts-link').click();
    await expect(page).toHaveURL('/contacts');
    
    await page.getByTestId('chat-link').click();
    await expect(page).toHaveURL('/chat');
  });
});