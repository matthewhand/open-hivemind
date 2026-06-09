const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set required authentication and bypass tokens in the browser
  await context.addCookies([
    {
      name: 'accessToken',
      value: 'mock-token',
      domain: 'localhost',
      path: '/',
    }
  ]);

  // Attempt to view the chat page
  await page.goto('http://localhost:3028/admin/chat');
  await page.evaluate(() => {
    localStorage.setItem('hivemind_token', 'mock-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 1, role: 'admin' }));
  });

  // Wait for load
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/chat_page.png' });
  console.log('Saved chat_page.png');

  // Navigate to Dashboard
  await page.goto('http://localhost:3028/admin/overview');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/dashboard.png' });
  console.log('Saved dashboard.png');

  await browser.close();
  console.log('Visual verification complete');
})();
