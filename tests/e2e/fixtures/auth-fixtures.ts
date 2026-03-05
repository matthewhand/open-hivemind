import { test as base, expect, Page } from '@playwright/test';
import { BasePage } from '../page-objects/base/BasePage';

// Define types for our test fixtures
export interface AuthFixtures {
  authenticatedPage: BasePage;
  adminPage: Page;
  userPage: Page;
  loginAsAdmin: () => Promise<void>;
  loginAsUser: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Define test user credentials
export const TEST_USERS = {
  admin: {
    username: process.env.TEST_ADMIN_USERNAME || 'admin',
    password: process.env.TEST_ADMIN_PASSWORD || 'HiveMindAdmin2024',
  },
  user: {
    username: process.env.TEST_USER_USERNAME || 'user',
    password: process.env.TEST_USER_PASSWORD || 'user',
  },
  invalid: {
    username: 'invalid',
    password: 'invalid',
  },
} as const;

/**
 * Inject auth by navigating to about:blank first, setting localStorage, then navigating to target.
 */
async function injectAuthAndNavigate(
  page: Page,
  targetPath: string,
  role: 'admin' | 'owner' = 'owner'
): Promise<void> {
  const fakeToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
  const fakeUser = {
    id: 'test-admin',
    username: 'admin',
    email: 'admin@open-hivemind.com',
    role: role,
    permissions: ['*'],
  };

  // Navigate to app origin to be able to set localStorage for that origin
  // Use /login as it's a valid route that should load quickly
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  // Set localStorage auth tokens
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({
          accessToken: token,
          refreshToken: token,
          expiresIn: 3600,
        })
      );
      localStorage.setItem('auth_user', JSON.stringify(user));
    },
    { token: fakeToken, user: fakeUser }
  );

  // Now navigate to target - auth should be recognized
  await page.goto(targetPath);
  await page.waitForLoadState('networkidle');

  // Extra wait for any React state updates
  await page.waitForTimeout(500);
}

// Extend the base test with our authentication fixtures
export const test = base.extend<AuthFixtures>({
  // Fixture for an authenticated page (admin by default)
  authenticatedPage: async ({ page }, use) => {
    await injectAuthAndNavigate(page, '/admin/overview', 'owner');
    const basePage = new BasePage(page);
    await use(basePage);
  },

  // Fixture for admin-specific page (returns Page for use with page objects)
  adminPage: async ({ page }, use) => {
    await injectAuthAndNavigate(page, '/admin/overview', 'owner');
    await use(page);
  },

  // Fixture for regular user page (returns Page for use with page objects)
  userPage: async ({ page }, use) => {
    await injectAuthAndNavigate(page, '/dashboard', 'admin');
    await use(page);
  },

  // Helper function to login as admin (uses JWT injection)
  loginAsAdmin: async ({ page }, use) => {
    const loginAsAdminFunc = async () => {
      await injectAuthAndNavigate(page, '/admin/overview', 'owner');
    };
    await use(loginAsAdminFunc);
  },

  // Helper function to login as any user
  loginAsUser: async ({ page }, use) => {
    const loginAsUserFunc = async (_username?: string, _password?: string) => {
      await injectAuthAndNavigate(page, '/dashboard', 'admin');
    };
    await use(loginAsUserFunc);
  },

  // Helper function to logout
  logout: async ({ page }, use) => {
    const logoutFunc = async () => {
      await page.evaluate(() => {
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
      });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    };
    await use(logoutFunc);
  },
});

// Export the extended test and expect
export { expect } from '@playwright/test';

// Re-export for convenience
export { BasePage } from '../page-objects/base/BasePage';

// Create a proper export for the extended test
export const extendedTest = test;
