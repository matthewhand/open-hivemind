import { expect, test } from '@playwright/test';

test.describe('Core Pages Rendering', () => {
  test('should render the dashboard page', async ({ page }) => {
    await page.goto('/');
    // Check for some common dashboard element
    await expect(page.locator('h1, h2')).toContainText(/Dashboard|Overview/i);
  });

  test('should render the bots management page', async ({ page }) => {
    await page.goto('/bots');
    await expect(page.locator('h1, h2')).toContainText(/Bots|Bot Configuration/i);
  });

  test('should render the configuration page', async ({ page }) => {
    await page.goto('/config');
    await expect(page.locator('h1, h2')).toContainText(/Configuration|Settings/i);
  });

  test('should render the help page', async ({ page }) => {
    await page.goto('/help');
    await expect(page.locator('h1, h2')).toContainText(/Help|Support|Documentation/i);
  });
});
