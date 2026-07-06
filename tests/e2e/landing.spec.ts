import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('shows sign-in button', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.locator('button[data-testid="sign-in"]');
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toContainText('Sign in with Google');
  });

  test('sign-in button links to auth endpoint', async ({ page }) => {
    await page.goto('/');
    const signInButton = page.locator('button[data-testid="sign-in"]');
    await signInButton.click();
    await expect(page).toHaveURL(/\/api\/auth\/login/);
  });
});

test.describe('Routing', () => {
  test('landing page renders at root', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button[data-testid="sign-in"]')).toBeVisible();
  });

  test('chat route exists', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
  });

  test('contacts route exists', async ({ page }) => {
    await page.goto('/contacts');
    await expect(page.locator('[data-testid="contacts-container"]')).toBeVisible();
  });
});