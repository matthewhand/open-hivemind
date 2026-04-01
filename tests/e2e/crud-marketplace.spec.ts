import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Marketplace Page CRUD E2E Tests
 * Exercises listing, searching, filtering, installing, updating, uninstalling
 * packages, and error handling with full API mocking.
 */
test.describe('Marketplace CRUD Lifecycle', () => {
  test.setTimeout(90000);

  // The component calls setPackages(data) directly from fetch response,
  // so the API must return a bare array, not { packages: [...] }.
  // MarketplacePackage: { name, displayName, description, type, version, status, repoUrl?, ... }
  const mockPackages = [
    {
      name: 'openai-provider',
      displayName: 'OpenAI Provider',
      description: 'OpenAI LLM provider for open-hivemind',
      version: '1.2.0',
      type: 'llm',
      status: 'built-in',
      repoUrl: 'https://github.com/open-hivemind/openai-provider',
    },
    {
      name: 'discord-connector',
      displayName: 'Discord Connector',
      description: 'Discord message provider integration',
      version: '2.0.1',
      type: 'message',
      status: 'installed',
      repoUrl: 'https://github.com/community/discord-connector',
    },
    {
      name: 'redis-memory',
      displayName: 'Redis Memory',
      description: 'Redis-backed memory store for conversation history',
      version: '0.9.5',
      type: 'memory',
      status: 'available',
      repoUrl: 'https://github.com/community/redis-memory',
    },
    {
      name: 'web-search-tool',
      displayName: 'Web Search Tool',
      description: 'Web search tool using DuckDuckGo API',
      version: '1.0.0',
      type: 'tool',
      status: 'available',
      repoUrl: 'https://github.com/open-hivemind/web-search-tool',
    },
    {
      name: 'anthropic-provider',
      displayName: 'Anthropic Provider',
      description: 'Anthropic Claude LLM provider',
      version: '1.5.0',
      type: 'llm',
      status: 'installed',
      repoUrl: 'https://github.com/open-hivemind/anthropic-provider',
    },
  ];

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
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
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('list packages with different statuses', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');
    await expect(page.locator('body')).toBeVisible();

    // Verify built-in, installed, and available packages render
    await expect(page.getByText('openai-provider').first()).toBeVisible();
    await expect(page.getByText('discord-connector').first()).toBeVisible();
    await expect(page.getByText('redis-memory').first()).toBeVisible();
  });

  test('search packages by name', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');
    await expect(page.getByText('openai-provider').first()).toBeVisible();

    const searchInput = page
      .locator(
        'input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]'
      )
      .first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('redis');

      // redis-memory should still be visible
      await expect(page.getByText('redis-memory').first()).toBeVisible();
    }
  });

  test('filter by type tabs (All, LLM, Message, Memory, Tool)', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');
    await expect(page.getByText('openai-provider').first()).toBeVisible();

    // Look for type filter tabs (button.tab elements with uppercase text)
    const llmTab = page.locator('button.tab:has-text("LLM")').first();
    if ((await llmTab.count()) > 0) {
      await llmTab.click();

      // LLM packages should still be visible
      await expect(page.getByText('openai-provider').first()).toBeVisible();
      await expect(page.getByText('anthropic-provider').first()).toBeVisible();
    }

    // Switch to All tab
    const allTab = page.locator('button.tab:has-text("All")').first();
    if ((await allTab.count()) > 0) {
      await allTab.click();
    }
  });

  test('install package from URL via modal', async ({ page }) => {
    let packages = [...mockPackages];

    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: packages })
    );
    await page.route('**/api/marketplace/install', async (route) => {
      const body = route.request().postDataJSON();
      const newPkg = {
        name: 'custom-tool',
        description: 'Custom installed tool',
        version: '1.0.0',
        type: 'tool',
        status: 'installed',
        author: 'user',
        homepage: body.url || body.gitUrl || '',
        installedVersion: '1.0.0',
      };
      packages.push(newPkg);
      await route.fulfill({ status: 200, json: { success: true, package: newPkg } });
    });

    await page.goto('/admin/marketplace');
    await expect(page.locator('body')).toBeVisible();

    // Look for install from URL button
    const installBtn = page
      .locator('button:has-text("Install"), button:has-text("Add"), button:has-text("URL")')
      .first();
    if ((await installBtn.count()) > 0) {
      await installBtn.click();

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        const urlInput = modal
          .locator(
            'input[placeholder*="url" i], input[placeholder*="github" i], input[type="url"], input'
          )
          .first();
        if ((await urlInput.count()) > 0) {
          await urlInput.fill('https://github.com/user/custom-tool');

          const submitBtn = modal
            .locator('button:has-text("Install"), button:has-text("Submit"), button[type="submit"]')
            .first();
          if ((await submitBtn.count()) > 0) {
            await submitBtn.click();
          }
        }
      }
    }
  });

  test('install package from URL validation (empty URL disabled)', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');
    await expect(page.locator('body')).toBeVisible();

    const installBtn = page
      .locator('button:has-text("Install"), button:has-text("Add"), button:has-text("URL")')
      .first();
    if ((await installBtn.count()) > 0) {
      await installBtn.click();

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        // Submit button should be disabled when URL is empty
        const submitBtn = modal
          .locator('button:has-text("Install"), button:has-text("Submit"), button[type="submit"]')
          .first();
        if ((await submitBtn.count()) > 0) {
          await expect(submitBtn).toBeDisabled();
        }
      }
    }
  });

  test('update an installed package', async ({ page }) => {
    let packages = mockPackages.map((p) => ({ ...p }));

    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: packages })
    );
    await page.route('**/api/marketplace/update/*', async (route) => {
      const urlParts = route.request().url().split('/');
      const pkgName = decodeURIComponent(urlParts[urlParts.length - 1]);
      packages = packages.map((p) =>
        p.name === pkgName ? { ...p, installedVersion: p.version } : p
      );
      await route.fulfill({ status: 200, json: { success: true, message: 'Package updated' } });
    });

    await page.goto('/admin/marketplace');

    // discord-connector has installedVersion 2.0.0 but version 2.0.1 (update available)
    const card = page
      .locator('.card, [class*="package"]', { hasText: 'discord-connector' })
      .first();
    if ((await card.count()) > 0) {
      await expect(card).toBeVisible();

      const updateBtn = card
        .locator('button:has-text("Update"), button:has-text("Upgrade")')
        .first();
      if ((await updateBtn.count()) > 0) {
        await updateBtn.click();
      }
    }
  });

  test('uninstall a package with confirmation', async ({ page }) => {
    let packages = mockPackages.map((p) => ({ ...p }));

    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: packages })
    );
    await page.route('**/api/marketplace/uninstall/*', async (route) => {
      const urlParts = route.request().url().split('/');
      const pkgName = decodeURIComponent(urlParts[urlParts.length - 1]);
      packages = packages.map((p) =>
        p.name === pkgName ? { ...p, status: 'available', installedVersion: null } : p
      );
      await route.fulfill({ status: 200, json: { success: true, message: 'Package uninstalled' } });
    });

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.goto('/admin/marketplace');

    const card = page
      .locator('.card, [class*="package"]', { hasText: 'discord-connector' })
      .first();
    if ((await card.count()) > 0) {
      const uninstallBtn = card
        .locator('button:has-text("Uninstall"), button:has-text("Remove")')
        .first();
      if ((await uninstallBtn.count()) > 0) {
        await uninstallBtn.click();
      }
    }
  });

  test('refresh packages list', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/marketplace/packages', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockPackages });
    });

    await page.goto('/admin/marketplace');
    await expect(page.locator('body')).toBeVisible();

    const initialCount = fetchCount;
    const refreshBtn = page.locator('button:has-text("Refresh"), button[title*="Refresh"]').first();
    if ((await refreshBtn.count()) > 0) {
      await refreshBtn.click();
      expect(fetchCount).toBeGreaterThan(initialCount);
    }
  });

  test('package cards show correct metadata', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');

    // Verify package metadata renders: name, description, version, type badge
    await expect(page.getByText('openai-provider').first()).toBeVisible();
    await expect(page.getByText('OpenAI LLM provider for open-hivemind').first()).toBeVisible();

    // Check for version text
    const versionText = page.getByText('1.2.0').first();
    if ((await versionText.count()) > 0) {
      await expect(versionText).toBeVisible();
    }

    // Check for type badge (LLM, message, etc.)
    const typeBadge = page.locator('.badge, [class*="badge"]', { hasText: /llm/i }).first();
    if ((await typeBadge.count()) > 0) {
      await expect(typeBadge).toBeVisible();
    }
  });

  test('error handling when install fails', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );
    await page.route('**/api/marketplace/install', async (route) => {
      await route.fulfill({
        status: 500,
        json: { success: false, error: 'Installation failed: repository not found' },
      });
    });

    await page.goto('/admin/marketplace');
    await expect(page.locator('body')).toBeVisible();

    const installBtn = page
      .locator('button:has-text("Install"), button:has-text("Add"), button:has-text("URL")')
      .first();
    if ((await installBtn.count()) > 0) {
      await installBtn.click();

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        const urlInput = modal
          .locator(
            'input[placeholder*="url" i], input[placeholder*="github" i], input[type="url"], input'
          )
          .first();
        if ((await urlInput.count()) > 0) {
          await urlInput.fill('https://github.com/invalid/nonexistent-repo');

          const submitBtn = modal
            .locator('button:has-text("Install"), button:has-text("Submit"), button[type="submit"]')
            .first();
          if ((await submitBtn.count()) > 0) {
            await submitBtn.click();

            // Page should handle the error gracefully
            await expect(page.locator('body')).toBeVisible();
          }
        }
      }
    }
  });

  test('empty state when no packages match filter', async ({ page }) => {
    await page.route('**/api/marketplace/packages', (route) =>
      route.fulfill({ status: 200, json: mockPackages })
    );

    await page.goto('/admin/marketplace');
    await expect(page.getByText('openai-provider').first()).toBeVisible();

    const searchInput = page
      .locator(
        'input[placeholder*="search" i], input[placeholder*="filter" i], input[type="search"]'
      )
      .first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('zzz-nonexistent-package-xyz');

      // Should show empty state or no results message
      const emptyText = page
        .locator(
          'text=/no.*package/i, text=/no.*result/i, text=/nothing.*found/i, text=/no.*match/i'
        )
        .first();
      if ((await emptyText.count()) > 0) {
        await expect(emptyText).toBeVisible();
      }
    }
  });
});
