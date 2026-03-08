import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test('Flowise config forms', async ({ page }) => {
<<<<<<< HEAD
=======
  // Mock successful authentication check
  await page.route('/api/auth/check', async (route) => {
    await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
  });

<<<<<<< HEAD
  // Try to click edit on flowise if it exists
  const flowiseCard = page.locator('text="Flowise"');
  if (await flowiseCard.count() > 0) {
      await flowiseCard.first().locator('..').locator('..').locator('button:has-text("Edit")').click().catch(() => null);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/flowise-config-verify.png', fullPage: true });
  }
=======
  // Mock background polling endpoints
  await page.route('/api/health/detailed', async (route) =>
    route.fulfill({ status: 200, json: { status: 'ok' } })
  );
  await page.route('/api/config/llm-status', async (route) =>
    route.fulfill({
      status: 200,
      json: {
        configured: true,
        providers: [{ id: 'openai-default', name: 'OpenAI GPT-4', type: 'openai' }],
        botsMissingLlmProvider: [],
        hasMissing: false,
        libraryStatus: {},
      },
    })
  );
  await page.route('/api/config/global', async (route) =>
    route.fulfill({
      status: 200,
      json: { _userSettings: { values: { webuiIntelligenceProvider: 'gpt-4-turbo' } } },
    })
  );

  // Mock LLM Profiles
  await page.route('/api/config/llm-profiles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: {
          llm: [
            {
              key: 'gpt-4-turbo',
              name: 'GPT-4 Turbo',
              provider: 'openai',
              config: {
                apiKey: 'sk-proj-********************',
                model: 'gpt-4-turbo-preview',
                temperature: 0.7,
              },
            }
          ],
        },
      }),
    });
  });

  await page.route('/api/admin/guard-profiles', async (route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('/api/demo/status', async (route) =>
    route.fulfill({ status: 200, json: { enabled: false } })
  );
  await page.route('/api/csrf-token', async (route) =>
    route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
  );

>>>>>>> origin/main
  const errors = await setupTestWithErrorDetection(page);
  await navigateAndWaitReady(page, '/admin/llm-providers');

<<<<<<< HEAD
  // Try to click edit on flowise if it exists
  const flowiseCard = page.locator('text="Flowise"');
  if ((await flowiseCard.count()) > 0) {
    await flowiseCard
      .first()
      .locator('..')
      .locator('..')
      .locator('button:has-text("Edit")')
      .click()
      .catch(() => null);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/flowise-config-verify.png', fullPage: true });
  }
=======
  // Navigate to LLM Providers page
  await navigateAndWaitReady(page, '/admin/providers/llm');

  // Take initial screenshot of LLM Providers page
  await page.screenshot({ path: 'test-results/flowise-config-verify-before.png', fullPage: true });

  // Click Create Profile
  const createBtn = page.getByRole('button', { name: 'Create Profile' });
  await createBtn.click();
  await page.waitForTimeout(500); // let modal animate in

  // Find and select the Flowise tab
  const flowiseTab = page.locator('button[role="tab"]:has-text("Flowise")');
  await expect(flowiseTab).toBeVisible();
  await flowiseTab.click();
  await page.waitForTimeout(1000); // Wait for the tab to be selected and fields to appear

  // Ensure specific Flowise fields render
  await expect(page.locator('label:has-text("Chatflow ID")')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('label:has-text("API Endpoint")')).toBeVisible({ timeout: 5000 });

  await page.screenshot({ path: 'test-results/flowise-config-verify-after.png', fullPage: true });

  // Check errors
  await assertNoErrors(errors, 'Flowise config forms');
>>>>>>> origin/main
>>>>>>> origin/main
});
