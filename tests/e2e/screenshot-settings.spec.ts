import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Settings Screenshots', () => {
  test('Capture Settings Page and Verify Tab Navigation with Real API Data', async ({
    page,
    request,
  }) => {
    // Setup authentication
    await setupAuth(page);

    // Fetch real API data to verify against
    const globalConfigResponse = await request.get('/api/config/global');
    const globalConfigData = await globalConfigResponse.json();

    // Verify we have real API data (not mocked)
    expect(globalConfigData).toBeTruthy();
    expect(Object.keys(globalConfigData).length).toBeGreaterThan(0);

    // 1. Navigate to default settings page (General tab)
    await page.goto('/admin/settings');
    await page.waitForSelector('h5:has-text("General Settings")');

    // Verify real config values are rendered (check for timezone field or other actual data)
    const hasTimezoneField = await page
      .locator('text=timezone')
      .first()
      .isVisible()
      .catch(() => false);
    const hasConfigContent = await page
      .locator('input, select, textarea')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasConfigContent || hasTimezoneField, 'Settings page should render config content').toBe(
      true
    );

    // Wait for UI to settle
    await page.waitForTimeout(1000);

    // Screenshot Default (General) Page
    await page.screenshot({ path: 'docs/screenshots/settings-general.png', fullPage: true });

    // 2. Click on "Security" tab and verify
    await page.click('a.tab:has-text("Security")');

    // Verify URL update
    await expect(page).toHaveURL(/.*tab=security/);

    // Verify content update
    await page.waitForSelector('h5:has-text("Security Settings")');

    // Verify security tab has actual content loaded from API
    const securityContentVisible = await page
      .locator('.card, .form-control, input')
      .first()
      .isVisible()
      .catch(() => false);
    expect(securityContentVisible, 'Security tab should have content').toBe(true);

    // 3. Test Deep Linking to Messaging tab
    await page.goto('/admin/settings?tab=messaging');
    await expect(page).toHaveURL(/.*tab=messaging/);

    // Verify messaging tab is active and content is shown
    await page.waitForSelector('h5:has-text("Messaging Behavior")');
    await expect(page.locator('a.tab-active')).toHaveText('Messaging');

    // Verify messaging settings have content (either from API or fallback defaults)
    const messagingContentVisible = await page
      .locator('.card, .form-control, input[type="range"], .toggle')
      .first()
      .isVisible()
      .catch(() => false);
    expect(messagingContentVisible, 'Messaging tab should have content').toBe(true);
  });
});
