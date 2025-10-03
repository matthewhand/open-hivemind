import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils';

test.describe('Dashboard experience', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/uber/overview');
  });

  test('shows overview and performance tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Open-Hivemind Dashboard' })).toBeVisible();
    await expect(page.getByText('Bot Status')).toBeVisible();

    await page.getByRole('tab', { name: 'Performance' }).click();
    await expect(page.getByText('Performance Metrics')).toBeVisible();

    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByText('Active Bots')).toBeVisible();
  });

  test('renders dashboard summary cards', async ({ page }) => {
    const summaryLabels = ['Active Bots', 'Total Messages', 'Error Rate', 'Uptime'];
    for (const label of summaryLabels) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });
});
