import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests.
 * This can be used to perform one-time setup like authentication.
 */
async function globalSetup(config: FullConfig) {
  // Example: Perform initial authentication and save state
  // const browser = await chromium.launch();
  // const page = await browser.newPage();
  // await page.goto(config.projects[0].use.baseURL + '/login');
  // await page.fill('input[name="username"]', 'admin');
  // await page.fill('input[name="password"]', 'admin');
  // await page.click('button[type="submit"]');
  // await page.waitForURL(/\/dashboard(\/)?$/i);
  // await page.context().storageState({ path: 'storageState.json' });
  // await browser.close();
}

export default globalSetup;
