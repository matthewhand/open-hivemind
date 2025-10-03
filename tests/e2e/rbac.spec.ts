import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('MCP guard configuration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/uber/guards', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      await route.fallback();
    });
    await page.goto('/uber/guards');
  });

  test('allows switching guard modes and adding entries', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'MCP Tool Guards' })).toBeVisible();

    const specificUsersRadio = page.getByLabel(/Specific Users/);
    await specificUsersRadio.check();
    await expect(specificUsersRadio).toBeChecked();

    await page.getByLabel('User ID or Username').fill('testuser123');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('.MuiChip-label', { hasText: 'testuser123' })).toBeVisible();

    await page.getByLabel('IP Address (e.g., 192.168.1.1)').fill('10.0.0.1');
    await page.getByRole('button', { name: 'Add' }).nth(1).click();
    await expect(page.locator('.MuiChip-label', { hasText: '10.0.0.1' })).toBeVisible();
  });

  test('saves guards configuration and shows confirmation', async ({ page }) => {
    await page.getByLabel(/Specific Users/).check();
    await page.getByLabel('User ID or Username').fill('owner123');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByRole('button', { name: 'Save Configuration' }).click();

    await expect(page.locator('[role="alert"]', { hasText: 'Guards configuration saved successfully' })).toBeVisible();
  });
});
