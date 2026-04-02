import { expect, test } from '@playwright/test';
import { setupAuth, setupErrorCollection, assertNoErrors } from './test-utils';

/**
 * Memory Providers Page E2E Tests
 * Exercises page load, profile display, expand/collapse, create modal,
 * search/filter, and empty state with API mocking.
 */
test.describe('Memory Providers Page', () => {
  test.setTimeout(90000);

  const mockMemoryProfiles = [
    {
      key: 'redis-cache-main',
      name: 'Redis Cache Main',
      type: 'redis',
      provider: 'mem0',
      config: {
        host: 'redis.internal',
        port: 6379,
        vectorStoreProvider: 'memory',
      },
      inUseBy: ['support-bot', 'sales-assistant'],
      isDefault: true,
    },
    {
      key: 'vector-db-pinecone',
      name: 'Pinecone Vector DB',
      type: 'pinecone',
      provider: 'mem4ai',
      config: {
        environment: 'us-west1-gcp',
        index: 'knowledge-base',
      },
      inUseBy: ['docs-bot'],
      isDefault: false,
    },
  ];

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/auth/check', (route) =>
        route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
      ),
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
      page.route('**/api/config/global', (route) =>
        route.fulfill({ status: 200, json: {} })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: [] })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { enabled: false } })
      ),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: [] } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('page loads without errors and displays profiles', async ({ page }) => {
    const errors = setupErrorCollection(page);

    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 200, json: { memory: mockMemoryProfiles } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Verify page header is visible
    await expect(page.locator('text=Memory Providers').first()).toBeVisible();

    // Verify stats cards show correct counts
    await expect(page.locator('text=Total Profiles').first()).toBeVisible();

    // Verify both profiles are displayed
    await expect(page.locator('text=Redis Cache Main').first()).toBeVisible();
    await expect(page.locator('text=Pinecone Vector DB').first()).toBeVisible();

    // Verify provider badges appear
    await expect(page.locator('text=mem0').first()).toBeVisible();
    await expect(page.locator('text=mem4ai').first()).toBeVisible();

    // Take screenshot of the initial loaded state
    await page.screenshot({
      path: 'docs/screenshots/memory-providers-list.png',
      fullPage: true,
    });

    await assertNoErrors(errors, 'page loads without errors');
  });

  test('expand profile shows configuration details', async ({ page }) => {
    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 200, json: { memory: mockMemoryProfiles } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Wait for profiles to render
    await expect(page.locator('text=Redis Cache Main').first()).toBeVisible();

    // Click on the first profile to expand it
    await page.locator('text=Redis Cache Main').first().click();

    // Wait for the configuration section to appear
    await expect(page.locator('text=Configuration').first()).toBeVisible();

    // Verify config values are shown
    await expect(page.locator('text=redis.internal').first()).toBeVisible();

    // Take screenshot of expanded profile
    await page.screenshot({
      path: 'docs/screenshots/memory-providers-expanded.png',
      fullPage: true,
    });
  });

  test('create profile modal opens and displays form', async ({ page }) => {
    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 200, json: { memory: mockMemoryProfiles } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Wait for page to load
    await expect(page.locator('text=Memory Providers').first()).toBeVisible();

    // Click the "Create Profile" button
    await page.getByRole('button', { name: 'Create Profile' }).click();

    // Wait for the modal to appear
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('text=Create Memory Profile').first()).toBeVisible();

    // Verify the form fields are present
    await expect(page.locator('#memory-profile-name')).toBeVisible();
    await expect(page.locator('#memory-profile-provider')).toBeVisible();

    // Take screenshot of the create modal
    await page.screenshot({
      path: 'docs/screenshots/memory-add-profile-modal.png',
    });
  });

  test('search filters profiles correctly', async ({ page }) => {
    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 200, json: { memory: mockMemoryProfiles } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Wait for profiles to render
    await expect(page.locator('text=Redis Cache Main').first()).toBeVisible();
    await expect(page.locator('text=Pinecone Vector DB').first()).toBeVisible();

    // Type a search query that matches only one profile
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill('Redis');

    // Wait for filtering to take effect
    await expect(page.locator('text=Redis Cache Main').first()).toBeVisible();
    // The other profile should be hidden
    await expect(page.locator('text=Pinecone Vector DB')).not.toBeVisible();

    // Take screenshot of filtered state
    await page.screenshot({
      path: 'docs/screenshots/memory-providers-filtered.png',
      fullPage: true,
    });
  });

  test('empty state displayed when no profiles configured', async ({ page }) => {
    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 200, json: { memory: [] } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Wait for the page header
    await expect(page.locator('text=Memory Providers').first()).toBeVisible();

    // Verify empty state message
    await expect(page.locator('text=No Profiles Created').first()).toBeVisible();

    // Verify the create action is available in empty state
    await expect(page.getByRole('button', { name: 'Create Profile' }).first()).toBeVisible();

    // Take screenshot of empty state
    await page.screenshot({
      path: 'docs/screenshots/memory-providers-empty.png',
      fullPage: true,
    });
  });

  test('refresh button reloads profiles', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/config/memory-profiles', (route) => {
      callCount++;
      return route.fulfill({ status: 200, json: { memory: mockMemoryProfiles } });
    });

    await page.goto('/admin/providers/memory');
    await expect(page.locator('text=Redis Cache Main').first()).toBeVisible();

    const initialCallCount = callCount;

    // Click the Refresh button
    await page.getByRole('button', { name: 'Refresh' }).click();

    // Wait for the data to reload (call count should increase)
    expect(callCount).toBeGreaterThan(initialCallCount);
  });

  test('error state displays alert when API fails', async ({ page }) => {
    await page.route('**/api/config/memory-profiles', (route) =>
      route.fulfill({ status: 500, json: { error: 'Internal server error' } })
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/providers/memory');

    // Wait for the page header
    await expect(page.locator('text=Memory Providers').first()).toBeVisible();

    // The error alert should appear
    await expect(page.locator('[class*="alert"]').first()).toBeVisible();
  });
});
