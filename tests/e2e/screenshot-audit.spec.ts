import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Audit & Governance Screenshots', () => {
  test('Capture Audit Page with Structured Query', async ({ page }) => {
    await setupAuth(page);

    await page.goto('/admin/audit');

    // Make sure page loads
    await expect(page.getByText('Enterprise Manager')).toBeVisible();

    // Click on "Audit & Governance" tab
    await page.getByText('Audit & Governance').click();

    await expect(page.getByText('Audit Events')).toBeVisible();

    // The gap analysis mentions "Governance Audit Log Structured Query"
    // Wait for the audit table to load
    await page.waitForLoadState('networkidle');

    // Initial state screenshot
    await page.screenshot({ path: 'docs/screenshots/audit-governance-initial.png' });

    // Type in the search box
    await page.getByPlaceholder('Search user, resource...').fill('admin');

    // Filter by action
    await page.getByRole('combobox').first().selectOption('CREATE_BOT');

    // Wait for UI to update
    await page.waitForLoadState('networkidle');

    // Captured structured query state
    await page.screenshot({ path: 'docs/screenshots/audit-governance-filtered.png' });
  });
});
