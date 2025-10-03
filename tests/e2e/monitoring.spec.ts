import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Monitoring page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/uber/monitoring');
  });

  test('shows live monitoring shell', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'System Monitoring' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Performance Monitor' })).toBeVisible();

    const refreshButton = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    await expect(refreshButton).toBeEnabled();

    const alert = page.locator('[role="alert"]').first();
    if (await alert.isVisible()) {
      await expect(alert).toContainText(/error|failed|unavailable/i);
    } else {
      await expect(page.getByText('Resource Utilisation')).toBeVisible();
    }
  });
});
