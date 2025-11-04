import { test as base, expect } from '@playwright/test';
import { BasePage } from '../page-objects/base/BasePage';

// Define types for our test fixtures
export interface AuthFixtures {
  authenticatedPage: BasePage;
  adminPage: BasePage;
  userPage: BasePage;
  loginAsAdmin: () => Promise<void>;
  loginAsUser: (username?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Define test user credentials
export const TEST_USERS = {
  admin: {
    username: process.env.TEST_ADMIN_USERNAME || 'admin',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin',
  },
  user: {
    username: process.env.TEST_USER_USERNAME || 'user',
    password: process.env.TEST_USER_PASSWORD || 'user',
  },
  invalid: {
    username: 'invalid',
    password: 'invalid',
  }
} as const;

// Extend the base test with our authentication fixtures
export const test = base.extend<AuthFixtures>({
  // Fixture for an authenticated page (admin by default)
  authenticatedPage: async ({ page }, use) => {
    const basePage = new BasePage(page);

    // Login as admin by default
    await basePage.navigateTo('/login');
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });
    await basePage.waitForLoadingToComplete();

    await use(basePage);
  },

  // Fixture for admin-specific page (returns Page for use with page objects)
  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="username"]', TEST_USERS.admin.username);
    await page.fill('input[name="password"]', TEST_USERS.admin.password);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });

    await use(page);
  },

  // Fixture for regular user page (returns Page for use with page objects)
  userPage: async ({ page }, use) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('input[name="username"]', TEST_USERS.user.username);
    await page.fill('input[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });

    await use(page);
  },

  // Helper function to login as admin
  loginAsAdmin: async ({ page }, use) => {
    const loginAsAdminFunc = async () => {
      await page.goto('/login');
      await page.fill('input[name="username"]', TEST_USERS.admin.username);
      await page.fill('input[name="password"]', TEST_USERS.admin.password);
      await page.click('button[type="submit"]');

      // Wait for successful login
      await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });
    };

    await use(loginAsAdminFunc);
  },

  // Helper function to login as any user
  loginAsUser: async ({ page }, use) => {
    const loginAsUserFunc = async (username?: string, password?: string) => {
      await page.goto('/login');
      await page.fill('input[name="username"]', username || TEST_USERS.user.username);
      await page.fill('input[name="password"]', password || TEST_USERS.user.password);
      await page.click('button[type="submit"]');

      // Wait for successful login
      await page.waitForURL(/\/dashboard(\/)?$/i, { timeout: 10000 });
    };

    await use(loginAsUserFunc);
  },

  // Helper function to logout
  logout: async ({ page }, use) => {
    const logoutFunc = async () => {
      // Try multiple logout methods
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        '[data-testid="logout"]',
        'a:has-text("Logout")',
        'a:has-text("Sign Out")'
      ];

      for (const selector of logoutSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          await element.click();
          break;
        }
      }

      // Wait for redirect to login page
      await page.waitForURL(/\/login/, { timeout: 10000 });
    };

    await use(logoutFunc);
  },
});

// Export the extended test and expect
export { expect } from '@playwright/test';

// Re-export for convenience
export { BasePage } from '../page-objects/base/BasePage';
export { TEST_USERS };

// Create a proper export for the extended test
export const extendedTest = test;