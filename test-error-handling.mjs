import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set auth tokens
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
  const fakeUser = JSON.stringify({
    id: 'admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*'],
  });
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_tokens', JSON.stringify({ accessToken: token, refreshToken: token, expiresIn: 3600 }));
    localStorage.setItem('auth_user', user);
  }, { token: fakeToken, user: fakeUser });

  // Add route handlers to force errors on bots and chat history
  await page.route('/api/bots', route => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Internal Server Error' })
  }));

  await page.goto('http://localhost:5173/admin/bots', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // Wait for animations
  await page.screenshot({ path: 'after-fix-bots-error.png' });

  await browser.close();
})();
