import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Onboarding Screenshots', () => {
  test('capture Onboarding Wizard', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({ status: 200, json: { data: { completed: false, step: 1 } } });
    });

    await page.route('**/api/onboarding/step', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          json: { data: { completed: false, step: body?.step ?? 1 } },
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/config/llm-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { profiles: { llm: [] } } });
    });

    await page.route('**/api/config/global', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: [] } });
    });

    await page.route('**/api/config/llm-status', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      });
    });

    await page.route('**/api/bots', async (route) => {
      await route.fulfill({ status: 200, json: { data: { bots: [] } } });
    });

    await page.route('**/api/personas', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    await page.route('**/api/demo/status', async (route) => {
      await route.fulfill({ status: 200, json: { active: false } });
    });

    await page.goto('/onboarding');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Welcome to Open-Hivemind')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'docs/screenshots/onboarding-page.png', fullPage: true });
  });
});
