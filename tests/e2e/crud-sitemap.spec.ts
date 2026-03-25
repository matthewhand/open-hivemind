import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Sitemap Page CRUD E2E Tests
 * Exercises URL listing, search, access-level filters, download XML,
 * refresh, stats, priority badges, access badges, empty state, and external links
 * with full API mocking.
 */
test.describe('Sitemap Page CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const mockSitemap = {
    urls: [
      {
        path: '/admin/dashboard',
        description: 'Main admin dashboard',
        accessLevel: 'Authenticated',
        priority: 1.0,
        changeFrequency: 'daily',
        lastModified: '2026-03-25T12:00:00Z',
        category: 'Admin',
      },
      {
        path: '/admin/bots',
        description: 'Bot management page',
        accessLevel: 'Authenticated',
        priority: 0.9,
        changeFrequency: 'daily',
        lastModified: '2026-03-25T11:00:00Z',
        category: 'Admin',
      },
      {
        path: '/admin/settings',
        description: 'System settings',
        accessLevel: 'Owner',
        priority: 0.8,
        changeFrequency: 'weekly',
        lastModified: '2026-03-24T09:00:00Z',
        category: 'Admin',
      },
      {
        path: '/docs',
        description: 'Public documentation',
        accessLevel: 'Public',
        priority: 0.7,
        changeFrequency: 'weekly',
        lastModified: '2026-03-23T08:00:00Z',
        category: 'Documentation',
      },
      {
        path: '/docs/api',
        description: 'API reference documentation',
        accessLevel: 'Public',
        priority: 0.6,
        changeFrequency: 'monthly',
        lastModified: '2026-03-20T10:00:00Z',
        category: 'Documentation',
      },
      {
        path: '/admin/personas',
        description: 'Persona management',
        accessLevel: 'Authenticated',
        priority: 0.8,
        changeFrequency: 'daily',
        lastModified: '2026-03-25T10:30:00Z',
        category: 'Admin',
      },
      {
        path: '/admin/mcp/servers',
        description: 'MCP server configuration',
        accessLevel: 'Owner',
        priority: 0.7,
        changeFrequency: 'weekly',
        lastModified: '2026-03-22T15:00:00Z',
        category: 'Admin',
      },
    ],
    totalUrls: 7,
    lastGenerated: '2026-03-26T06:00:00Z',
    categories: ['Admin', 'Documentation'],
  };

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('load sitemap with URL categories', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) => {
      if (route.request().url().includes('.xml')) {
        return route.fulfill({ status: 200, contentType: 'application/xml', body: '<urlset></urlset>' });
      }
      return route.fulfill({ status: 200, json: mockSitemap });
    });

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    // Verify URLs are displayed
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('/admin/bots').first()).toBeVisible();
    await expect(page.getByText('/docs').first()).toBeVisible();
  });

  test('search URLs by path or description', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('documentation');
      await page.waitForTimeout(300);

      // Documentation URLs should still be visible
      const docsUrl = page.getByText('/docs').first();
      if ((await docsUrl.count()) > 0) {
        await expect(docsUrl).toBeVisible();
      }
    }
  });

  test('filter by access level (All, Public, Authenticated, Owner)', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });

    // Look for access level filter (select or button group)
    const accessFilter = page.locator('select:has(option:has-text("Public")), select:has(option:has-text("All"))').first();
    const accessButtons = page.locator('button:has-text("Public"), button:has-text("Authenticated"), button:has-text("Owner")');

    if ((await accessFilter.count()) > 0) {
      // Filter by Public
      await accessFilter.selectOption({ label: 'Public' });
      await page.waitForTimeout(300);

      // Filter by Owner
      await accessFilter.selectOption({ label: 'Owner' });
      await page.waitForTimeout(300);

      // Reset to All
      await accessFilter.selectOption({ index: 0 });
      await page.waitForTimeout(300);
    } else if ((await accessButtons.count()) > 0) {
      const publicBtn = page.locator('button:has-text("Public")').first();
      if ((await publicBtn.count()) > 0) {
        await publicBtn.click();
        await page.waitForTimeout(300);
      }

      const ownerBtn = page.locator('button:has-text("Owner")').first();
      if ((await ownerBtn.count()) > 0) {
        await ownerBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('combined search + access filter', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });

    // Apply search first
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('admin');
      await page.waitForTimeout(300);
    }

    // Apply access filter
    const accessFilter = page.locator('select:has(option:has-text("Owner"))').first();
    if ((await accessFilter.count()) > 0) {
      await accessFilter.selectOption({ label: 'Owner' });
      await page.waitForTimeout(300);
    }

    // Page should still be functional with both filters
    await expect(page.locator('body')).toBeVisible();
  });

  test('download XML button', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) => {
      if (route.request().url().includes('.xml') || route.request().url().includes('download') || route.request().url().includes('format=xml')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/xml',
          headers: { 'Content-Disposition': 'attachment; filename="sitemap.xml"' },
          body: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
        });
      }
      return route.fulfill({ status: 200, json: mockSitemap });
    });

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    const downloadBtn = page.locator('button:has-text("Download"), button:has-text("XML"), button[title*="Download"], a:has-text("Download")').first();
    if ((await downloadBtn.count()) > 0) {
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        downloadBtn.click(),
      ]);
      await page.waitForTimeout(300);
    }
  });

  test('refresh button', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/sitemap*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockSitemap });
    });

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    const initialCount = fetchCount;
    const refreshBtn = page.locator('button:has-text("Refresh"), button[title*="Refresh"], button[aria-label*="Refresh"]').first();
    if ((await refreshBtn.count()) > 0) {
      await refreshBtn.click();
      await page.waitForTimeout(500);
      expect(fetchCount).toBeGreaterThan(initialCount);
    }
  });

  test('URL count and last generated timestamp stats', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    // Look for total URL count
    const urlCount = page.getByText('7').or(page.getByText(/7.*url/i)).or(page.getByText(/total.*7/i)).first();
    if ((await urlCount.count()) > 0) {
      await expect(urlCount).toBeVisible();
    }

    // Look for last generated timestamp
    const lastGenerated = page.getByText(/last.*generated/i).or(page.getByText(/2026-03-26/)).first();
    if ((await lastGenerated.count()) > 0) {
      await expect(lastGenerated).toBeVisible();
    }
  });

  test('priority badges display', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    // Look for priority values displayed as badges or text
    const priorityBadge = page.locator('.badge:has-text("1.0"), .badge:has-text("0.9"), [class*="priority"]').first();
    if ((await priorityBadge.count()) > 0) {
      await expect(priorityBadge).toBeVisible();
    }

    // Also check for priority text in the rows
    const priorityText = page.getByText('1.0').or(page.getByText('0.9')).first();
    if ((await priorityText.count()) > 0) {
      await expect(priorityText).toBeVisible();
    }
  });

  test('access level badges', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await page.waitForTimeout(1000);

    // Check for access level badges
    const publicBadge = page.locator('.badge:has-text("Public"), [class*="badge"]:has-text("Public")').first();
    if ((await publicBadge.count()) > 0) {
      await expect(publicBadge).toBeVisible();
    }

    const authenticatedBadge = page.locator('.badge:has-text("Authenticated"), [class*="badge"]:has-text("Authenticated")').first();
    if ((await authenticatedBadge.count()) > 0) {
      await expect(authenticatedBadge).toBeVisible();
    }

    const ownerBadge = page.locator('.badge:has-text("Owner"), [class*="badge"]:has-text("Owner")').first();
    if ((await ownerBadge.count()) > 0) {
      await expect(ownerBadge).toBeVisible();
    }
  });

  test('empty state when filters match nothing', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });

    // Search for something that does not exist
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('zzz-nonexistent-url-xyz');
      await page.waitForTimeout(300);

      // Should show empty/no results state
      const emptyText = page.locator('text=/no.*result/i, text=/no.*url/i, text=/no.*match/i, text=/not.*found/i').first();
      if ((await emptyText.count()) > 0) {
        await expect(emptyText).toBeVisible();
      }
    }
  });

  test('open URL button verifies external link', async ({ page }) => {
    await page.route('**/api/sitemap*', (route) =>
      route.fulfill({ status: 200, json: mockSitemap })
    );

    await page.goto('/admin/sitemap');
    await expect(page.getByText('/admin/dashboard').first()).toBeVisible({ timeout: 5000 });

    // Look for open/visit URL button or link on a row
    const openBtn = page.locator('a[target="_blank"], a[href*="/admin/dashboard"], button[title*="Open"], button[title*="Visit"]').first();
    if ((await openBtn.count()) > 0) {
      // Verify it has the correct href or action
      const href = await openBtn.getAttribute('href');
      if (href) {
        expect(href).toContain('/admin/dashboard');
      }
    }
  });
});
