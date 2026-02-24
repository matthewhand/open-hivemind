const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const fakeToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
  const fakeUser = JSON.stringify({
    id: 'admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*'],
  });

  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({
          accessToken: token,
          refreshToken: token,
          expiresIn: 3600,
        })
      );
      localStorage.setItem('auth_user', user);
    },
    { token: fakeToken, user: fakeUser }
  );

  // Mock APIs
  await page.route('**/api/config', async (route) => {
    await route.fulfill({ body: JSON.stringify({ bots: [] }) });
  });
  await page.route('**/api/config/global', async (route) => {
    await route.fulfill({ body: JSON.stringify({}) });
  });
  await page.route('**/api/llm/profiles', async (route) => {
    await route.fulfill({ body: JSON.stringify({ profiles: { llm: [] } }) });
  });
  await page.route('**/api/personas', async (route) => {
    await route.fulfill({ body: JSON.stringify([]) });
  });
  await page.route('**/api/admin/guard-profiles', async (route) => {
    await route.fulfill({ body: JSON.stringify({ data: [] }) });
  });

  try {
    console.log('Navigating to Bots Page...');
    await page.goto('http://localhost:3028/admin/bots');
    await page.waitForTimeout(2000); // Wait for animations/load
    await page.screenshot({ path: 'verification/bots_empty.png' });
    console.log('Screenshot saved to verification/bots_empty.png');

    console.log('Navigating to Guards Page...');
    await page.goto('http://localhost:3028/admin/guards');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'verification/guards_empty.png' });
    console.log('Screenshot saved to verification/guards_empty.png');

    console.log('Navigating to Personas Page...');
    await page.goto('http://localhost:3028/admin/personas');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'verification/personas_empty.png' });
    console.log('Screenshot saved to verification/personas_empty.png');
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
