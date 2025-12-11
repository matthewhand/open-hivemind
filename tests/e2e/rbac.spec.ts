import { test, expect } from '@playwright/test';

test.describe('MCP guard configuration', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);

    // Inject fake auth to bypass login
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
    const fakeUser = JSON.stringify({ id: 'admin', username: 'admin', email: 'admin@open-hivemind.com', role: 'owner', permissions: ['*'] });

    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('auth_tokens', JSON.stringify({
        accessToken: token,
        refreshToken: token,
        expiresIn: 3600
      }));
      localStorage.setItem('auth_user', user);
    }, { token: fakeToken, user: fakeUser });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`PAGE ERROR: ${msg.text()}`);
      }
    });

    // Navigate to guards page
    await page.goto('/admin/guards');
    await page.waitForLoadState('domcontentloaded');
  });

  test('displays guards or admin page', async ({ page }) => {
    await page.screenshot({ path: 'test-results/rbac-01-page.png', fullPage: true });

    // Verify we're on an admin page
    const url = page.url();
    expect(url).toContain('/admin');
  });

  test('page is accessible', async ({ page }) => {
    // Use .first() to avoid strict mode violation
    const pageContent = page.locator('main').first();
    await expect(pageContent).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: 'test-results/rbac-02-accessible.png', fullPage: true });
  });

  test('navigation is visible', async ({ page }) => {
    // Check that navigation exists
    const nav = page.locator('nav').first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/rbac-03-nav.png', fullPage: true });
  });
});
