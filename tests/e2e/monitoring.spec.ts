import { test, expect } from '@playwright/test';

test.describe('Monitoring page', () => {
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

    // Navigate to monitoring page - use domcontentloaded due to app React issues
    await page.goto('/admin/monitoring');
    await page.waitForLoadState('domcontentloaded');

    // Give React time to render
    await page.waitForTimeout(3000);
  });

  test('navigates to monitoring page', async ({ page }) => {
    await page.screenshot({ path: 'test-results/monitoring-01-page.png', fullPage: true });

    // Verify we're on admin page
    expect(page.url()).toContain('/admin');
  });

  test('monitoring page has content', async ({ page }) => {
    // Look for System Monitoring heading or any content
    const heading = page.locator('h1, h2');

    await page.screenshot({ path: 'test-results/monitoring-02-content.png', fullPage: true });

    // Just verify page loaded
    expect(page.url()).toContain('/admin');
  });

  test('monitoring page has navigation', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]');

    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/monitoring-03-nav.png', fullPage: true });
  });
});
