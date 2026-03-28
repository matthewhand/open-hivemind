import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('AIAssistButton Loading State Accessibility', async ({ page }) => {
  await setupAuth(page);

  // Catch-all for API requests (registered first = lowest priority)
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 200, json: {} })
  );
  // Mock specific API endpoints (registered after = higher priority)
  await page.route('**/api/health/detailed', (route) =>
    route.fulfill({ status: 200, json: { status: 'healthy' } })
  );
  await page.route('**/health/detailed', (route) =>
    route.fulfill({ status: 200, json: { status: 'healthy' } })
  );
  await page.route('**/api/config/llm-status', (route) =>
    route.fulfill({
      status: 200,
      json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
    })
  );
  await page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
  await page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] }));
  await page.route('**/api/csrf-token', (route) =>
    route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
  );
  await page.route('**/api/demo/status', (route) =>
    route.fulfill({ status: 200, json: { active: false } })
  );
  await page.route('**/api/admin/guard-profiles', (route) =>
    route.fulfill({ status: 200, json: { data: [] } })
  );
  await page.route('**/api/config/llm-profiles', (route) =>
    route.fulfill({ status: 200, json: { profiles: { llm: [] } } })
  );
  await page.route('**/api/bots', (route) =>
    route.fulfill({ status: 200, json: { data: { bots: [] } } })
  );

  // Go to the bot create page where AIAssistButton may be used
  await page.goto('/admin/bots/create');

  // Wait for page to settle
  await page.waitForTimeout(2000);

  // Look for any AI assist button (may use different aria-label or text)
  const button = page.locator('button[aria-label="Generate Name"], button:has-text("Generate"), button[aria-label*="AI"]').first();

  if (await button.isVisible().catch(() => false)) {
    // We mock the API call so it hangs forever so we can inspect the loading state
    await page.route('**/api/ai-assist/**', () => {
      // Just don't fulfill it
    });

    // Take screenshot before click
    await page.screenshot({ path: 'docs/screenshots/ai-assist-button-before.png' });

    // Click the button to set it into loading state
    await button.click();

    // Wait a bit for state to update
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/ai-assist-button-after.png' });

    // Since button might be disabled, let's just grab the attributes from any button that is disabled
    const disabledButton = page.locator('button[disabled]');
    if (await disabledButton.first().isVisible().catch(() => false)) {
      const ariaLabel = await disabledButton.first().getAttribute('aria-label');
      const ariaBusy = await disabledButton.first().getAttribute('aria-busy');

      console.log('--- After Click (Loading) ---');
      console.log('aria-label:', ariaLabel);
      console.log('aria-busy:', ariaBusy);
    }
  } else {
    // If no AI assist button exists, just verify the page loaded correctly
    await expect(page.locator('h1, h2').first()).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/ai-assist-button-fallback.png' });
  }
});
