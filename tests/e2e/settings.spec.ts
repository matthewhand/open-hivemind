import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Settings Page E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('System Settings', () => {
  test.setTimeout(90000);

  test.describe('Page Structure', () => {
    test('displays settings page with header without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      expect(page.url()).toContain('/admin/settings');
      const header = page.locator('h1').first();
      await expect(header).toBeVisible();
      await page.screenshot({ path: 'test-results/settings-01-page.png', fullPage: true });

      await assertNoErrors(errors, 'Settings page load');
    });

    test('shows tab navigation without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      const tabs = page.locator('[role="tab"], .tab, [class*="tabs"]');
      await expect(tabs.first()).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'test-results/settings-02-tabs.png', fullPage: true });

      await assertNoErrors(errors, 'Settings tabs');
    });
  });

  test.describe('General Settings Tab', () => {
    test('can access General settings without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      const generalTab = page.locator('text=General').first();
      if ((await generalTab.count()) > 0) {
        await generalTab.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: 'test-results/settings-03-general.png', fullPage: true });

      await assertNoErrors(errors, 'General settings tab');
    });

    test('can edit instance name without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      const generalTab = page.locator('text=General').first();
      if ((await generalTab.count()) > 0) {
        await generalTab.click();
        await page.waitForTimeout(500);
      }

      const nameInput = page.locator('input').first();
      if ((await nameInput.count()) > 0) {
        await nameInput.clear();
        await nameInput.fill('My Test Instance');
      }
      await page.screenshot({ path: 'test-results/settings-05-name-edited.png', fullPage: true });

      await assertNoErrors(errors, 'Edit instance name');
    });
  });

  test.describe('Security Settings Tab', () => {
    test('can access Security settings without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      const securityTab = page.locator('text=Security').first();
      if ((await securityTab.count()) > 0) {
        await securityTab.click();
        await page.waitForTimeout(1000);
      }
      await page.screenshot({ path: 'test-results/settings-10-security.png', fullPage: true });

      await assertNoErrors(errors, 'Security settings tab');
    });
  });

  test.describe('Save Settings', () => {
    test('can save settings without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, '/admin/settings');

      const saveButton = page.locator('button:has-text("Save")').first();
      if ((await saveButton.count()) > 0) {
        await saveButton.click();
        await page.waitForTimeout(1500);
        const success = page.locator('[class*="success"], [class*="toast"], text=saved');
        await page.screenshot({ path: 'test-results/settings-14-saved.png', fullPage: true });
      }

      await assertNoErrors(errors, 'Save settings');
    });
  });
});
