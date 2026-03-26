import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('API Rate Limiting UI', async ({ page }) => {
  await setupAuth(page);

  // Mock common endpoints
  await page.route('**/api/health/detailed', (route) =>
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
  await page.route('**/api/csrf-token', (route) =>
    route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
  );
  await page.route('**/api/demo/status', (route) =>
    route.fulfill({ status: 200, json: { active: false } })
  );
  await page.route('**/api/admin/guard-profiles', (route) =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [
          {
            id: 'strict-1',
            name: 'Strict Protection',
            description: 'Strict guard profile',
            guards: {
              mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
              rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
              contentFilter: { enabled: true, strictness: 'high' },
            },
          },
        ],
      },
    })
  );

  await page.goto('/admin/guards');

  // Wait a bit just in case
  await page.waitForTimeout(2000);

  // Click edit to open modal
  const editButton = page
    .locator('.card', { hasText: 'Strict Protection' })
    .locator('.btn-ghost')
    .nth(1);
  await editButton.click();

  // Wait for modal
  const editModal = page.locator('.modal-box').filter({ hasText: 'Edit Guard Profile' });
  await expect(editModal).toBeVisible();

  // Find the Rate Limiter section and open it
  const rateLimiterTitle = editModal.locator('.collapse-title', { hasText: 'Rate Limiter' });
  await expect(rateLimiterTitle).toBeVisible();

  // Click on the title to expand
  await rateLimiterTitle.click({ force: true });
  await page.waitForTimeout(500); // wait for animation

  // Scroll modal content to bottom
  await page.evaluate(() => {
    const modal = document.querySelector('.modal-box');
    if (modal) modal.scrollTop = modal.scrollHeight;
  });

  await page.waitForTimeout(500); // Wait for scroll to settle
  await editModal.screenshot({ path: 'after-fix.png' });
});
