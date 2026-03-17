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

  await page.goto('http://localhost:3030/admin/bots', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'before-click-bots.png' });

  // Add route handlers to force errors on bots
  await page.route('**/api/bots', route => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Internal Server Error' })
  }));

<<<<<<<< HEAD:test-error-handling-before.mjs
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: 'after-fix-sidebar-error.png' });
========
  await page.goto('http://localhost:5173/admin/bots', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // Wait for animations
  await page.screenshot({ path: 'after-fix-bots-error.png' });
>>>>>>>> 6c9b86703 (Refiner (Frontend Build): Fix tsc build failure on Netlify by using npx tsc):test-error-handling.mjs

  await browser.close();
})();
