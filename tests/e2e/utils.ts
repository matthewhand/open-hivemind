import type { Page } from '@playwright/test';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');

  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });
  await page.waitForSelector('text=Open-Hivemind Dashboard', { timeout: 10000 });
}
