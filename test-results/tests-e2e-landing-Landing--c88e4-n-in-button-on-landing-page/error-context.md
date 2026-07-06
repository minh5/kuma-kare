# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/landing.spec.ts >> Landing Page >> shows sign-in button on landing page
- Location: tests/e2e/landing.spec.ts:4:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/kuma/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Landing Page', () => {
  4  |   test('shows sign-in button on landing page', async ({ page }) => {
> 5  |     await page.goto('/kuma/');
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6  |     const signInButton = page.locator('button[data-testid="sign-in"]');
  7  |     await expect(signInButton).toBeVisible();
  8  |     await expect(signInButton).toContainText('Sign in with Google');
  9  |   });
  10 | 
  11 |   test('landing page has correct title', async ({ page }) => {
  12 |     await page.goto('/kuma/');
  13 |     await expect(page).toHaveTitle(/Kuma/);
  14 |   });
  15 | 
  16 |   test('sign-in button triggers auth flow', async ({ page }) => {
  17 |     await page.goto('/kuma/');
  18 |     const signInButton = page.locator('button[data-testid="sign-in"]');
  19 |     await signInButton.click();
  20 |     // Should redirect to login endpoint
  21 |     await expect(page).toHaveURL(/\/kuma\/api\/auth\/login|accounts\.google\.com/);
  22 |   });
  23 | 
  24 |   test('assets load from correct base path', async ({ page }) => {
  25 |     const responses: string[] = [];
  26 |     page.on('response', (response) => {
  27 |       if (response.url().includes('.js') || response.url().includes('.css')) {
  28 |         responses.push(response.url());
  29 |       }
  30 |     });
  31 |     await page.goto('/kuma/');
  32 |     await page.waitForLoadState('networkidle');
  33 |     // All JS/CSS assets should be under /kuma/
  34 |     const nonKumaAssets = responses.filter(url => !url.includes('/kuma/'));
  35 |     expect(nonKumaAssets).toHaveLength(0);
  36 |   });
  37 | });
  38 | 
```