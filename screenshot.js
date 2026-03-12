const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'after-fix-dashboard.png' });
    console.log("Screenshot generated at after-fix-dashboard.png");
  } catch(e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
