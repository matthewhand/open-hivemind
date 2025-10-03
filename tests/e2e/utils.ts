import type { Page } from '@playwright/test';
import { ConfigurationManager } from '../../src/config/ConfigurationManager';

export async function loginAsAdmin(page: Page): Promise<void> {
  const configManager = ConfigurationManager.getInstance();
  const config = configManager.getConfig('environment');
  const baseUrl = (config as any)?.get('PLAYWRIGHT_BASE_URL') || 'http://localhost:3000';
  await page.goto(`${baseUrl}/login`);

  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/webui(\/)?$/i, { timeout: 8000 });
  await page.waitForSelector('text=Open-Hivemind Dashboard', { timeout: 8000 });
}
