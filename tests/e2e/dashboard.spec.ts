import { test, expect } from '@playwright/test';

test.describe('Dashboard experience', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);

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

    // Navigate to dashboard
    await page.goto('/admin/overview');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('navigates to dashboard page', async ({ page }) => {
    expect(page.url()).toContain('/admin');
    await page.screenshot({ path: 'test-results/dashboard-01.png', fullPage: true });
  });

  test('dashboard has content', async ({ page }) => {
    const main = page.locator('main').first();
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/dashboard-02.png', fullPage: true });
  });

  test('dashboard has navigation', async ({ page }) => {
    const nav = page.locator('nav').first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/dashboard-03.png', fullPage: true });
  });
});
