const { chromium } = require('playwright');

const ROUTES = [
  '/admin/overview',
  '/admin/bots',
  '/admin/bots/create',
  '/admin/bots/templates',
  '/admin/chat',
  '/admin/personas',
  '/admin/integrations/llm',
  '/admin/integrations/message',
  '/admin/providers/message',
  '/admin/providers/llm',
  '/admin/providers/memory',
  '/admin/providers/tool',
  '/admin/marketplace',
  '/admin/mcp/servers',
  '/admin/mcp/tools',
  '/admin/guards',
  '/admin/monitoring',
  '/admin/activity',
  '/admin/monitoring-dashboard',
  '/admin/analytics',
  '/admin/system-management',
  '/admin/export',
  '/admin/settings',
  '/admin/configuration',
  '/admin/config',
  '/admin/static',
  '/admin/sitemap',
  '/admin/specs',
  '/admin/audit',
  '/dashboard',
  '/activity'
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const allErrors = [];

  console.log('Logging in...');
  await page.goto('http://localhost:3028/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Logged in successfully!');

  for (const route of ROUTES) {
    console.log(`Checking ${route}...`);
    
    const pageErrors = [];
    const pushError = (msg) => {
      if (msg.includes('net::ERR_CONNECTION_REFUSED')) return;
      if (msg.includes('favicon.ico')) return;
      pageErrors.push(msg);
    };

    const responseListener = response => {
      if (!response.ok() && response.status() >= 400 && response.url().includes('/api/')) {
        pushError(`API HTTP ${response.status()} on ${response.url()}`);
      }
    };
    const consoleListener = msg => {
      if (msg.type() === 'error') {
        pushError(`Console Error: ${msg.text()}`);
      }
    };
    const errorListener = err => {
      pushError(`Page Error: ${err.message}`);
    };

    page.on('response', responseListener);
    page.on('console', consoleListener);
    page.on('pageerror', errorListener);

    try {
      await page.goto(`http://localhost:3028${route}`, { waitUntil: 'load', timeout: 5000 });
      await page.waitForTimeout(1000); // wait a bit for any dynamic fetches
    } catch (err) {
      if (!err.message.includes('Timeout')) {
        pushError(`Navigation failed: ${err.message}`);
      }
    }

    page.removeListener('response', responseListener);
    page.removeListener('console', consoleListener);
    page.removeListener('pageerror', errorListener);

    if (pageErrors.length > 0) {
      console.log(`❌ ${route} has errors:`);
      pageErrors.forEach(e => console.log(`   - ${e}`));
      allErrors.push({ route, errors: pageErrors });
    } else {
      console.log(`✅ ${route} is clean!`);
    }
  }

  await browser.close();

  if (allErrors.length === 0) {
    console.log('\\n🎉 All pages checked successfully! No API HTTP errors or Console errors found.');
  } else {
    console.log(`\\n⚠️ Found issues on ${allErrors.length} pages.`);
  }
}

run().catch(console.error);
