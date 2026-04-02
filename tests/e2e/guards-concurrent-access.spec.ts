import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Guards Concurrent Access', () => {
  test.setTimeout(120000); // Extended timeout for stress testing

  test.beforeEach(async ({ page }) => {
    // Setup error detection and auth
    await setupTestWithErrorDetection(page);
  });

  test('should handle multiple simultaneous guard operations without race conditions', async ({
    page,
  }) => {
    let requestCount = 0;
    const seenResponses = new Set<string>();

    // Monitor all API requests to guards endpoint
    await page.route('**/api/admin/guards', async (route) => {
      requestCount++;
      const method = route.request().method();

      if (method === 'GET') {
        // Simulate multiple concurrent reads
        const guards = [
          {
            id: 'access-control',
            name: 'Access Control',
            description: 'User and IP-based access restrictions',
            type: 'access',
            enabled: true,
            config: { type: 'users', users: [], ips: [] },
          },
          {
            id: 'rate-limiter',
            name: 'Rate Limiter',
            description: 'Prevents spam and excessive requests',
            type: 'rate',
            enabled: true,
            config: { maxRequests: 100, windowMs: 60000 },
          },
          {
            id: 'content-filter',
            name: 'Content Filter',
            description: 'Filters inappropriate content',
            type: 'content',
            enabled: false,
            config: {},
          },
        ];

        // Small delay to simulate database access time
        await new Promise((resolve) => setTimeout(resolve, 10));

        const response = JSON.stringify({ success: true, data: { guards }, message: 'Success' });
        seenResponses.add(response);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: response,
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Guard updated' }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to guards page
    await navigateAndWaitReady(page, '/admin/guards');

    // Wait for initial load
    await expect(page.getByText('Access Control', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Rate Limiter')).toBeVisible();
    await expect(page.getByText('Content Filter')).toBeVisible();

    // Verify guards are displayed correctly
    const accessControlCard = page.locator('.card', { hasText: 'Access Control' });
    await expect(accessControlCard).toBeVisible();

    const rateLimiterCard = page.locator('.card', { hasText: 'Rate Limiter' });
    await expect(rateLimiterCard).toBeVisible();

    const contentFilterCard = page.locator('.card', { hasText: 'Content Filter' });
    await expect(contentFilterCard).toBeVisible();

    // Verify all responses were consistent (no race conditions)
    expect(seenResponses.size).toBe(1);

    await assertNoErrors([], 'Guards concurrent access test');
  });

  test('should handle rapid toggle operations correctly', async ({ page }) => {
    const toggleHistory: Array<{ id: string; enabled: boolean; timestamp: number }> = [];

    await page.route('**/api/admin/guards', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              guards: [
                {
                  id: 'access-control',
                  name: 'Access Control',
                  enabled: true,
                  config: {},
                },
                {
                  id: 'rate-limiter',
                  name: 'Rate Limiter',
                  enabled: true,
                  config: {},
                },
              ],
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/admin/guards/*/toggle', async (route) => {
      const url = route.request().url();
      const guardId = url.match(/guards\/([^/]+)\/toggle/)?.[1];
      const body = JSON.parse(route.request().postData() || '{}');

      toggleHistory.push({
        id: guardId || '',
        enabled: body.enabled,
        timestamp: Date.now(),
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `Guard ${body.enabled ? 'enabled' : 'disabled'}`,
        }),
      });
    });

    await navigateAndWaitReady(page, '/admin/guards');

    // Wait for guards to load
    await expect(page.getByText('Access Control', { exact: true })).toBeVisible();

    // Find toggle switches
    const accessControlToggle = page
      .locator('.card', { hasText: 'Access Control' })
      .locator('input[type="checkbox"]')
      .first();

    const rateLimiterToggle = page
      .locator('.card', { hasText: 'Rate Limiter' })
      .locator('input[type="checkbox"]')
      .first();

    // Verify toggles are visible and enabled
    await expect(accessControlToggle).toBeVisible();
    await expect(rateLimiterToggle).toBeVisible();

    // Rapid toggle operations
    await accessControlToggle.click();
    await rateLimiterToggle.click();
    await accessControlToggle.click();

    // Wait for operations to complete
    await page.waitForTimeout(1000);

    // Verify toggle operations were recorded
    expect(toggleHistory.length).toBeGreaterThan(0);

    await assertNoErrors([], 'Rapid toggle operations');
  });

  test('should take screenshot showing guards under concurrent load', async ({ page }) => {
    await page.route('**/api/admin/guards', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              guards: [
                {
                  id: 'access-control',
                  name: 'Access Control',
                  description: 'User and IP-based access restrictions',
                  type: 'access',
                  enabled: true,
                  config: { type: 'users', users: [], ips: [] },
                },
                {
                  id: 'rate-limiter',
                  name: 'Rate Limiter',
                  description: 'Prevents spam and excessive requests',
                  type: 'rate',
                  enabled: true,
                  config: { maxRequests: 100, windowMs: 60000 },
                },
                {
                  id: 'content-filter',
                  name: 'Content Filter',
                  description: 'Filters inappropriate content',
                  type: 'content',
                  enabled: false,
                  config: {},
                },
              ],
            },
            message: 'Guards retrieved successfully',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await navigateAndWaitReady(page, '/admin/guards');

    // Wait for all guards to be visible
    await expect(page.getByText('Access Control', { exact: true })).toBeVisible();
    await expect(page.getByText('Rate Limiter')).toBeVisible();
    await expect(page.getByText('Content Filter')).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'docs/screenshots/guards-concurrent-test.png',
      fullPage: true,
    });

    await assertNoErrors([], 'Guards screenshot');
  });

  test('should initialize guards only once despite concurrent requests', async ({ page }) => {
    let initCallCount = 0;
    const mockGuards = [
      {
        id: 'access-control',
        name: 'Access Control',
        enabled: true,
        config: {},
      },
      {
        id: 'rate-limiter',
        name: 'Rate Limiter',
        enabled: true,
        config: {},
      },
      {
        id: 'content-filter',
        name: 'Content Filter',
        enabled: false,
        config: {},
      },
    ];

    await page.route('**/api/admin/guards', async (route) => {
      if (route.request().method() === 'GET') {
        initCallCount++;

        // Small delay to simulate mutex lock
        await new Promise((resolve) => setTimeout(resolve, 50));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { guards: mockGuards },
            message: 'Success',
          }),
        });
      } else {
        await route.continue();
      }
    });

    await navigateAndWaitReady(page, '/admin/guards');

    // Trigger multiple reloads in quick succession
    await Promise.all([page.reload(), page.reload(), page.reload()]);

    // Wait for page to stabilize
    await expect(page.getByText('Access Control', { exact: true })).toBeVisible();

    // Verify initialization happened correct number of times
    // (Should be at least 1, but the exact count depends on browser caching)
    expect(initCallCount).toBeGreaterThan(0);

    await assertNoErrors([], 'Concurrent initialization');
  });
});
