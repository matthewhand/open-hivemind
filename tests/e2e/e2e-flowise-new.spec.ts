import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Flowise Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          configured: true,
          providers: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
          libraryStatus: {},
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: { profiles: { llm: [] } } })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );
  });

  test('Flowise modal', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 800 });

    // Navigate to LLM Providers page
    await page.goto('/admin/providers/llm');
    await page.waitForTimeout(1000);

    // Click "Create Profile" button
    const createBtn = page.getByRole('button', { name: 'Create Profile' });
    if (await createBtn.count() > 0) {
      await createBtn.first().click();

      // Wait for modal to be visible
      const modal = page.locator('.modal-box');
      await expect(modal).toBeVisible();

      // See if Flowise exists in the tabs
      const tabs = await page.locator('.tab').allTextContents();
      console.log('Available tabs:', tabs);

      const flowiseTab = page.locator('.tab', { hasText: 'Flowise' });
      if (await flowiseTab.count() > 0) {
        await flowiseTab.first().click();
        await page.waitForTimeout(500);
      } else {
        console.log('Flowise tab not found. Taking screenshot to see what is there.');
      }

      await page.screenshot({ path: 'test-results/flowise-new-modal.png' });
    }
  });
});
