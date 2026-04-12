import { type Page } from '@playwright/test';

/**
 * Helper utilities for Playwright E2E tests
 * Re-exports common test utilities for convenience
 */

/**
 * Authenticate as admin user
 * Sets up localStorage with fake auth tokens for testing
 */
export async function authenticateAsAdmin(page: Page): Promise<void> {
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
}

/**
 * Wait for an API response from a specific endpoint
 * @param page - Playwright page object
 * @param urlPattern - URL pattern to match (string or regex)
 * @param timeout - Timeout in milliseconds
 * @returns The response object
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<Response> {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Setup common API mocks for a page
 * Useful for tests that need basic data without full backend
 */
export async function setupCommonMocks(page: Page): Promise<void> {
  // Mock health check
  await page.route('**/{,api/}health/detailed', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'healthy',
        version: '1.0.0',
        uptime: 12345,
      }),
    });
  });

  // Mock user info
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin',
        username: 'admin',
        email: 'admin@open-hivemind.com',
        role: 'owner',
      }),
    });
  });
}

/**
 * Take a screenshot with consistent naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: { fullPage?: boolean }
): Promise<void> {
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: options?.fullPage ?? true,
  });
}

// Re-export from test-utils for convenience
export { setupAuth, setupErrorCollection, assertNoErrors, waitForPageReady } from './test-utils';
