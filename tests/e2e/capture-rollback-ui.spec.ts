import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('capture rollback UI screenshots', async ({ page }) => {
  await setupAuth(page);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Common mocks
  await page.route('/api/auth/check', async (route) => {
    await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
  });
  await page.route('/api/health/detailed', async (route) =>
    route.fulfill({ status: 200, json: { status: 'ok' } })
  );
  await page.route('/api/config/global', async (route) =>
    route.fulfill({
      status: 200,
      json: {
        server: {
          values: {
            port: 3000,
          },
          schema: {
            properties: {
              port: {
                format: 'port',
                default: 3000,
              },
            },
          },
        },
      },
    })
  );
  await page.route('/api/csrf-token', async (route) =>
    route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
  );
  await page.route('/api/config/llm-status', async (route) =>
    route.fulfill({ status: 200, json: { configured: true, hasMissing: false } })
  );

  // 1. Mock empty rollbacks
  await page.route('/api/config/hot-reload/rollbacks', async (route) => {
    await route.fulfill({ status: 200, json: { rollbacks: [] } });
  });

  await page.goto('/admin/configuration');
  await page.waitForLoadState('networkidle');

  const rollbackButton = page.locator('button:has-text("Rollbacks")');
  await expect(rollbackButton).toBeDisabled();

  await page.screenshot({ path: '/home/jules/verification/config-rollback-empty-fixed.png' });

  // 2. Mock rollbacks available
  await page.route('/api/config/hot-reload/rollbacks', async (route) => {
    await route.fulfill({ status: 200, json: { rollbacks: ['rollback_1711234567890_xxyyzz'] } });
  });

  // Refresh to get new mock
  await page.locator('button:has-text("Reload")').click();
  await page.waitForLoadState('networkidle');

  await expect(rollbackButton).toBeEnabled();
  await expect(rollbackButton).toContainText('1');

  await page.screenshot({ path: '/home/jules/verification/config-rollback-available-fixed.png' });

  // 3. Open modal and mock rollback action
  await rollbackButton.click();
  await page.waitForTimeout(500);

  const modal = page.locator('.modal-box');
  await expect(modal).toBeVisible();
  await expect(modal.locator('text=rollback_1711234567890_xxyyzz')).toBeVisible();

  await page.screenshot({ path: '/home/jules/verification/config-rollback-modal-fixed.png' });
});
