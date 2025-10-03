import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('authenticates with demo credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/webui(\/)?$/);
    await expect(page.getByRole('heading', { name: 'Open-Hivemind Dashboard' })).toBeVisible();
  });

  test('shows validation error for bad credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'invalid');
    await page.fill('input[name="password"]', 'invalid');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid username or password')).toBeVisible();
  });

  test('disables submit while loading', async ({ page }) => {
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'wrong');

    const submitButton = page.getByRole('button', { name: 'Sign In' });
    await submitButton.click();
    await expect(submitButton).toBeDisabled();
  });
});
