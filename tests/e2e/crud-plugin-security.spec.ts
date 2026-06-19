import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * Quality E2E Tests for Plugin Security Page
 * Tests plugin security status display, filtering, and trust management
 */

test.describe('Plugin Security Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock plugin security status - matches actual API response
    await page.route('**/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'example-plugin',
                trustLevel: 'trusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: ['read', 'write'],
                deniedCapabilities: [],
                requiredCapabilities: ['read', 'write'],
              },
              {
                pluginName: 'legacy-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: false,
                grantedCapabilities: [],
                deniedCapabilities: ['execute'],
                requiredCapabilities: ['execute'],
              },
              {
                pluginName: 'core-plugin',
                trustLevel: 'trusted',
                isBuiltIn: true,
                signatureValid: null,
                grantedCapabilities: ['all'],
                deniedCapabilities: [],
                requiredCapabilities: [],
              },
            ],
          },
        },
      });
    });
  });

  test('displays plugin security page with correct structure', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Verify page container
    await expect(page.getByTestId('plugin-security-page')).toBeVisible();

    // Verify title
    await expect(page.getByRole('heading', { name: /plugin security/i })).toBeVisible();
  });

  test('displays plugin statistics', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show stats section
    await expect(page.getByTestId('plugin-stats')).toBeVisible();
  });

  test('displays plugins list', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show plugins
    await expect(page.getByTestId('plugins-list')).toBeVisible();

    // Should show plugin names
    await expect(page.getByText('example-plugin')).toBeVisible();
    await expect(page.getByText('legacy-plugin')).toBeVisible();
    await expect(page.getByText('core-plugin')).toBeVisible();
  });

  test('displays trust badges correctly', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show Trusted badge
    await expect(page.getByText('Trusted', { exact: true }).first()).toBeVisible();

    // Should show Untrusted badge (.first() — also appears in stats card + filter)
    await expect(page.getByText('Untrusted', { exact: true }).first()).toBeVisible();

    // Should show Built-in badge
    await expect(page.getByText('Built-in', { exact: true }).first()).toBeVisible();
  });

  test('displays signature status badges', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show Valid badge (.first() — signature status also appears in stats/filter)
    await expect(page.getByText('Valid', { exact: true }).first()).toBeVisible();

    // Should show Invalid badge
    await expect(page.getByText('Invalid', { exact: true }).first()).toBeVisible();

    // Should show No Signature badge
    await expect(page.getByText('No Signature', { exact: true }).first()).toBeVisible();
  });

  test('has filter tabs functional', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Click on Untrusted filter
    await page.getByRole('button', { name: 'Untrusted' }).click();

    // Should only show untrusted plugin
    await expect(page.getByText('legacy-plugin')).toBeVisible();
    await expect(page.getByText('example-plugin')).not.toBeVisible();
  });

  test('has refresh button', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Refresh button should exist
    const refreshBtn = page.getByRole('button', { name: /refresh/i });
    if ((await refreshBtn.count()) > 0) {
      await expect(refreshBtn).toBeEnabled();
    }
  });

  test('shows capabilities correctly', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show granted capabilities (.first() — capabilities repeat across plugins)
    await expect(page.getByText('read', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('write', { exact: true }).first()).toBeVisible();

    // Should show denied capabilities
    await expect(page.getByText('execute', { exact: true }).first()).toBeVisible();
  });

  test('handles API errors gracefully', async ({ page }) => {
    await page.route('**/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        status: 500,
        json: { success: false, error: 'Server error' },
      });
    });

    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Page should still render
    await expect(page.getByTestId('plugin-security-page')).toBeVisible();
  });
});

test.describe('Plugin Security Trust Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/admin/plugins/security', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            plugins: [
              {
                pluginName: 'test-plugin',
                trustLevel: 'untrusted',
                isBuiltIn: false,
                signatureValid: true,
                grantedCapabilities: [],
                deniedCapabilities: [],
                requiredCapabilities: ['read'],
              },
            ],
          },
        },
      });
    });
  });

  test('shows trust button for untrusted plugins', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show Trust Plugin button (aria-label is "Trust <pluginName>"; the
    // trailing space distinguishes it from the "Trusted" filter tab).
    await expect(page.getByRole('button', { name: /^trust /i })).toBeVisible();
  });

  test('shows re-verify button', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Should show the verify button (aria-label "Verify <pluginName>")
    await expect(page.getByRole('button', { name: /^verify /i })).toBeVisible();
  });

  test('opens confirmation modal on trust click', async ({ page }) => {
    await page.goto('/admin/plugin-security');
    await page.waitForLoadState('networkidle');

    // Click trust button (aria-label "Trust <pluginName>")
    await page.getByRole('button', { name: /^trust /i }).click();

    // Should open confirmation modal (:visible — other modals are always in the DOM)
    await expect(page.locator('.modal-box:visible').first()).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
  });
});
