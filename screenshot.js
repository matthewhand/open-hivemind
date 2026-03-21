const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const reportPath = path.resolve('coverage/lcov-report/index.html');
  await page.goto(`file://${reportPath}`);

  await page.screenshot({ path: 'baseline-coverage.png', fullPage: true });

  await browser.close();
})();
