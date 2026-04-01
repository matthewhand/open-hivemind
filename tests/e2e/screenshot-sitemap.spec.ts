import { expect, test } from '@playwright/test';

test.describe('Sitemap Screenshots', () => {
  test('Capture Sitemap page screenshot', async ({ page }) => {
    // Intercept APIs
    await page.route('/api/config', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          authEnabled: false,
          version: '1.0.0',
        },
      });
    });

    await page.route('/api/config/providers', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          providers: {
            llm: [
              { id: 'openai', name: 'OpenAI', isConfigured: true },
              { id: 'anthropic', name: 'Anthropic', isConfigured: true },
            ],
            messaging: [
              { id: 'discord', name: 'Discord', isConfigured: true },
              { id: 'slack', name: 'Slack', isConfigured: false },
            ],
          },
        },
      });
    });

    // Go to Sitemap page
    await page.goto('/sitemap');

    // Screenshot
    await page.waitForLoadState("domcontentloaded");
    await page.screenshot({ path: 'docs/screenshots/sitemap-page.png', fullPage: true });
  });
});
