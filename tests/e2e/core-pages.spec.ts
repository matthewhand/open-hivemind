import { expect, test } from '@playwright/test';
import { waitForPageReady } from './test-utils';

/**
 * Inject a fake JWT into localStorage so ProtectedRoute considers the
 * session authenticated, then navigate to `targetPath`.
 *
 * The token payload has exp=9999999999 (year 2286). The client reads the
 * expiry directly from the payload without verifying the signature, so the
 * localStorage injection is sufficient for the React router to render the
 * protected page.  Server-side API calls work because the webServer is started
 * with ALLOW_TEST_BYPASS=true / ALLOW_LOCALHOST_ADMIN=true.
 */
async function injectAuthAndNavigate(
  page: import('@playwright/test').Page,
  targetPath: string
): Promise<void> {
  // A JWT whose payload has a far-future expiry and a fake (but parseable) signature.
  // AuthContext only checks the `exp` field client-side; it never verifies the
  // signature in the browser.
  const fakeToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ' +
    '.signature';

  const fakeUser = {
    id: 'test-admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: 'owner',
    permissions: ['*'],
  };

  // Navigate to /login first to establish the app origin so we can set
  // localStorage for that origin. Bounded waits throughout: this spec runs
  // against the live server (no mocks), where unbounded waits hang until the
  // test timeout.
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Let any client-side redirect settle before evaluate — page.evaluate
  // against a navigating context hangs until the test timeout.
  await waitForPageReady(page, 5000);

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({ accessToken: token, refreshToken: token, expiresIn: 3600 })
      );
      localStorage.setItem('auth_user', JSON.stringify(user));
    },
    { token: fakeToken, user: fakeUser }
  );

  // Navigate to the target; ProtectedRoute will now see isAuthenticated=true.
  // waitForPageReady caps the networkidle wait, which is unbounded against an
  // app with background polling.
  await page.goto(targetPath, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForPageReady(page, 5000);
}

test.describe('Core Pages Rendering', () => {
  test('should render the dashboard page', async ({ page }) => {
    await injectAuthAndNavigate(page, '/admin/overview');
    await expect(page.locator('h1').first()).toContainText(/Dashboard|Overview/i);
  });

  test('should render the bots management page', async ({ page }) => {
    await injectAuthAndNavigate(page, '/admin/bots');
    await expect(page.locator('h1').first()).toContainText(/Bots|Bot Configuration/i);
  });

  test('should render the configuration page', async ({ page }) => {
    await injectAuthAndNavigate(page, '/admin/config');
    await expect(page.locator('h1').first()).toContainText(/Configuration|Settings/i);
  });

  test('should render the help page', async ({ page }) => {
    await injectAuthAndNavigate(page, '/admin/help');
    await expect(page.locator('h1').first()).toContainText(/Help|Support|Documentation/i);
  });
});
