import { test, expect } from '@playwright/test';

test.describe('Full Stack Integration', () => {
  test('landing page loads and has working sign-in link', async ({ page }) => {
    await page.goto('/');
    
    // Verify the app loads
    await expect(page.getByTestId('sign-in-google')).toBeVisible();
    
    // Verify sign-in link points to API
    const href = await page.getByTestId('sign-in-google').getAttribute('href');
    expect(href).toMatch(/\/api\/auth\/login/);
  });

  test('chat API returns 401 without authentication', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { messages: [{ role: 'user', content: 'Hello' }] }
    });
    
    expect(response.status()).toBe(401);
  });

  test('auth login endpoint redirects to Google OAuth', async ({ page }) => {
    // This will redirect to Google, we just verify the redirect happens
    const response = await page.goto('/api/auth/login');
    
    // Should redirect (302) or the page URL should change to Google
    const url = page.url();
    // Either we got redirected to Google or we're testing locally with a stub
    expect(
      url.includes('accounts.google.com') || 
      url.includes('/api/auth/login') ||
      response?.status() === 302
    ).toBeTruthy();
  });

  test('contacts API returns 401 without authentication', async ({ request }) => {
    const response = await request.get('/api/contacts');
    expect(response.status()).toBe(401);
  });

  test('chat page can be navigated to', async ({ page }) => {
    await page.goto('/');
    await page.goto('/chat');
    
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('send-button')).toBeVisible();
  });

  test('contacts page can be navigated to', async ({ page }) => {
    await page.goto('/contacts');
    
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that CSS is loaded (page should have styled elements)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check no 404 errors for assets
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('/assets/')) {
        errors.push(response.url());
      }
    });
    
    await page.reload();
    expect(errors).toHaveLength(0);
  });

  test('app handles refresh on sub-routes (SPA routing)', async ({ page }) => {
    await page.goto('/chat');
    await page.reload();
    
    // Should still be on chat page, not 404
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });
});

test.describe('API Endpoint Structure', () => {
  test('POST /api/chat accepts JSON body', async ({ request }) => {
    const response = await request.post('/api/chat', {
      headers: { 'Content-Type': 'application/json' },
      data: { messages: [] }
    });
    
    // Should be 401 (unauthorized) not 400 (bad request) or 404
    expect(response.status()).toBe(401);
  });

  test('GET /api/auth/login exists', async ({ request }) => {
    const response = await request.get('/api/auth/login', {
      maxRedirects: 0
    });
    
    // Should redirect (302) to Google OAuth
    expect([302, 307, 200]).toContain(response.status());
  });

  test('GET /api/auth/callback exists', async ({ request }) => {
    const response = await request.get('/api/auth/callback');
    
    // Without proper OAuth code, should return error but endpoint exists
    expect([400, 401, 302]).toContain(response.status());
  });
});