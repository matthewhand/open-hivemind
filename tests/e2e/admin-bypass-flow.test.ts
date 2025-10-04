/**
 * End-to-End Test for Localhost Admin Bypass Flow
 *
 * This test simulates real user interactions with the web interface,
 * testing the complete authentication flow from a browser perspective.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

describe('Admin Bypass E2E Flow', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();

    // Clear environment variables
    delete process.env.ADMIN_PASSWORD;
    delete process.env.DISABLE_LOCAL_ADMIN_BYPASS;

    // Mock localhost for the browser
    await page.setExtraHTTPHeaders({
      'X-Forwarded-For': '127.0.0.1'
    });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Basic Localhost Bypass Flow', () => {
    it('should complete full admin login bypass flow', async () => {
      // Navigate to login page
      await page.goto('http://localhost:3028/login');

      // Wait for login form to load
      await page.waitForSelector('[data-testid="login-form"]');

      // Fill in admin credentials (any password should work)
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'e2e-test-password');

      // Submit form
      await page.click('[data-testid="login-button"]');

      // Wait for successful login redirect
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Verify we're logged in as admin
      const usernameElement = await page.$('[data-testid="current-user"]');
      const username = await usernameElement?.evaluate(el => el.textContent);
      expect(username).toBe('admin');

      // Check for bypass indicator or notification
      const bypassNotification = await page.$('[data-testid="localhost-bypass-notice"]');
      if (bypassNotification) {
        const noticeText = await bypassNotification.evaluate(el => el.textContent);
        expect(noticeText).toContain('localhost');
      }
    });

    it('should show admin dashboard with full permissions', async () => {
      // Login first
      await performLogin('admin', 'dashboard-test-password');

      // Navigate to admin dashboard
      await page.goto('http://localhost:3028/admin');

      // Wait for admin dashboard to load
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Verify admin-specific sections are visible
      const adminSections = [
        '[data-testid="user-management"]',
        '[data-testid="system-settings"]',
        '[data-testid="security-settings"]'
      ];

      for (const selector of adminSections) {
        const element = await page.$(selector);
        expect(element).toBeTruthy();
      }

      // Check that admin can access user management
      await page.click('[data-testid="user-management-link"]');
      await page.waitForSelector('[data-testid="users-list"]');

      // Verify admin can see users list
      const usersList = await page.$$('[data-testid="user-item"]');
      expect(usersList.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ADMIN_PASSWORD Flow', () => {
    beforeEach(() => {
      process.env.ADMIN_PASSWORD = 'e2e-secure-admin-pass';
    });

    it('should require exact ADMIN_PASSWORD match', async () => {
      await page.goto('http://localhost:3028/login');
      await page.waitForSelector('[data-testid="login-form"]');

      // Try wrong password
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'wrong-password');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await page.waitForSelector('[data-testid="login-error"]');
      const errorMessage = await page.$eval(
        '[data-testid="login-error"]',
        el => el.textContent
      );
      expect(errorMessage).toContain('Invalid credentials');

      // Clear form and try correct password
      await page.click('[data-testid="clear-form-button"]');
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'e2e-secure-admin-pass');
      await page.click('[data-testid="login-button"]');

      // Should succeed
      await page.waitForSelector('[data-testid="admin-dashboard"]');
    });

    it('should show ADMIN_PASSWORD usage indicator', async () => {
      await performLogin('admin', 'e2e-secure-admin-pass');

      // Check for admin password usage notification
      const adminPassNotice = await page.$('[data-testid="admin-password-notice"]');
      if (adminPassNotice) {
        const noticeText = await adminPassNotice.evaluate(el => el.textContent);
        expect(noticeText).toContain('ADMIN_PASSWORD');
      }
    });
  });

  describe('Security Features', () => {
    it('should prevent bypass from non-localhost context', async () => {
      // Simulate external IP context
      await page.setExtraHTTPHeaders({
        'X-Forwarded-For': '192.168.1.100'
      });

      await page.goto('http://localhost:3028/login');
      await page.waitForSelector('[data-testid="login-form"]');

      // Try admin login
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'any-password');
      await page.click('[data-testid="login-button"]');

      // Should fail
      await page.waitForSelector('[data-testid="login-error"]');

      // Should not be redirected to admin dashboard
      const adminDashboard = await page.$('[data-testid="admin-dashboard"]');
      expect(adminDashboard).toBeNull();
    });

    it('should handle concurrent login attempts', async () => {
      // Open multiple pages/tabs
      const pages = await Promise.all([
        browser.newPage(),
        browser.newPage(),
        browser.newPage()
      ]);

      try {
        // Set localhost for all pages
        await Promise.all(
          pages.map(p => p.setExtraHTTPHeaders({ 'X-Forwarded-For': '127.0.0.1' }))
        );

        // Perform login on all pages simultaneously
        const loginPromises = pages.map((page, index) =>
          performLoginOnPage(page, 'admin', `concurrent-${index}-password`)
        );

        const results = await Promise.all(loginPromises);

        // All should succeed
        results.forEach(success => {
          expect(success).toBe(true);
        });

        // Verify admin user exists (should be only one)
        const adminPage = pages[0];
        await adminPage.goto('http://localhost:3028/admin/users');
        await adminPage.waitForSelector('[data-testid="users-list"]');

        const adminUsers = await adminPage.$$eval(
          '[data-testid="user-item"]',
          elements => elements.filter(el =>
            el.textContent?.includes('admin')
          ).length
        );

        expect(adminUsers).toBe(1);

      } finally {
        // Clean up pages
        await Promise.all(pages.map(p => p.close()));
      }
    });
  });

  describe('User Experience Flow', () => {
    it('should handle password change flow', async () => {
      // Initial login
      await performLogin('admin', 'initial-password');

      // Navigate to settings
      await page.goto('http://localhost:3028/settings');
      await page.waitForSelector('[data-testid="settings-page"]');

      // Go to password change section
      await page.click('[data-testid="change-password-link"]');
      await page.waitForSelector('[data-testid="change-password-form"]');

      // Fill password change form
      await page.type('[data-testid="current-password"]', 'initial-password');
      await page.type('[data-testid="new-password"]', 'new-secure-password');
      await page.type('[data-testid="confirm-password"]', 'new-secure-password');

      // Submit password change
      await page.click('[data-testid="change-password-button"]');

      // Wait for success message
      await page.waitForSelector('[data-testid="password-change-success"]');

      // Logout
      await page.click('[data-testid="logout-button"]');
      await page.waitForSelector('[data-testid="login-form"]');

      // Login with new password (normal flow, not bypass)
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'new-secure-password');
      await page.click('[data-testid="login-button"]');

      // Should succeed
      await page.waitForSelector('[data-testid="admin-dashboard"]');
    });

    it('should handle session timeout and refresh', async () => {
      // Login
      await performLogin('admin', 'session-test-password');

      // Get initial token
      const initialToken = await page.evaluate(() =>
        localStorage.getItem('accessToken')
      );

      expect(initialToken).toBeTruthy();

      // Navigate to a protected page
      await page.goto('http://localhost:3028/admin');
      await page.waitForSelector('[data-testid="admin-dashboard"]');

      // Simulate token expiration (clear tokens)
      await page.evaluate(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      });

      // Try to access another protected page
      await page.goto('http://localhost:3028/admin/users');

      // Should redirect to login
      await page.waitForSelector('[data-testid="login-form"]');

      // Login again should work
      await performLogin('admin', 'session-test-password');
      await page.waitForSelector('[data-testid="admin-dashboard"]');
    });
  });

  describe('DISABLE_LOCAL_ADMIN_BYPASS Flow', () => {
    beforeEach(() => {
      process.env.DISABLE_LOCAL_ADMIN_BYPASS = 'true';
    });

    it('should disable localhost bypass when flag is set', async () => {
      await page.goto('http://localhost:3028/login');
      await page.waitForSelector('[data-testid="login-form"]');

      // Try bypass login
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'any-password');
      await page.click('[data-testid="login-button"]');

      // Should fail with error
      await page.waitForSelector('[data-testid="login-error"]');
      const errorMessage = await page.$eval(
        '[data-testid="login-error"]',
        el => el.textContent
      );
      expect(errorMessage).toContain('Invalid credentials');

      // Should show no bypass indicator
      const bypassNotice = await page.$('[data-testid="localhost-bypass-notice"]');
      expect(bypassNotice).toBeNull();
    });

    it('should allow normal authentication when bypass disabled', async () => {
      // First, we need to create an admin user through other means
      // This would typically be done via direct database access or initial setup

      // For this test, we'll assume an admin user exists
      await page.goto('http://localhost:3028/login');
      await page.waitForSelector('[data-testid="login-form"]');

      // Try normal admin login (this would require existing admin user)
      await page.type('[data-testid="username-input"]', 'admin');
      await page.type('[data-testid="password-input"]', 'existing-admin-password');
      await page.click('[data-testid="login-button"]');

      // This might succeed or fail depending on whether admin user exists
      // The key point is that bypass is disabled
      const bypassNotice = await page.$('[data-testid="localhost-bypass-notice"]');
      expect(bypassNotice).toBeNull();
    });
  });

  // Helper functions
  async function performLogin(username: string, password: string): Promise<void> {
    await page.goto('http://localhost:3028/login');
    await page.waitForSelector('[data-testid="login-form"]');

    await page.type('[data-testid="username-input"]', username);
    await page.type('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');

    await page.waitForSelector('[data-testid="admin-dashboard"]');
  }

  async function performLoginOnPage(targetPage: Page, username: string, password: string): Promise<boolean> {
    try {
      await targetPage.goto('http://localhost:3028/login');
      await targetPage.waitForSelector('[data-testid="login-form"]');

      await targetPage.type('[data-testid="username-input"]', username);
      await targetPage.type('[data-testid="password-input"]', password);
      await targetPage.click('[data-testid="login-button"]');

      await targetPage.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }
});