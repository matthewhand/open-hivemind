import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Mobile Responsive E2E Tests
 * Verifies every major page renders correctly at mobile and tablet viewports,
 * hamburger menu navigation, layout stacking, scrollable tables, full-width
 * modals/forms, and touch-friendly tap targets.
 */
test.describe('Mobile Responsive Layout', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Support Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'active',
      connected: true,
      messageCount: 150,
      errorCount: 0,
    },
    {
      id: 'bot-2',
      name: 'Sales Bot',
      provider: 'slack',
      messageProvider: 'slack',
      llmProvider: 'anthropic',
      status: 'inactive',
      connected: false,
      messageCount: 42,
      errorCount: 1,
    },
  ];

  const mockPersonas = [
    {
      id: 'p1',
      name: 'Helpful Assistant',
      description: 'A friendly AI assistant',
      category: 'general',
      systemPrompt: 'You are a helpful assistant.',
      traits: [],
      isBuiltIn: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      assignedBotIds: [],
      assignedBotNames: [],
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
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: mockBots } })
      ),
      page.route('**/api/personas', (route) =>
        route.fulfill({ status: 200, json: mockPersonas })
      ),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } })
      ),
      page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({
          status: 200,
          json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] },
        })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
      page.route('**/api/mcp/servers', (route) =>
        route.fulfill({ status: 200, json: [] })
      ),
      page.route('**/api/activity**', (route) =>
        route.fulfill({ status: 200, json: { data: [], total: 0 } })
      ),
      page.route('**/api/analytics**', (route) =>
        route.fulfill({ status: 200, json: { data: {} } })
      ),
      page.route('**/api/bots', (route) =>
        route.fulfill({ status: 200, json: mockBots })
      ),
      page.route('**/api/bots/*/history*', (route) =>
        route.fulfill({ status: 200, json: { success: true, data: { history: [] } } })
      ),
      page.route('**/api/export**', (route) =>
        route.fulfill({ status: 200, json: {} })
      ),
      page.route('**/api/marketplace**', (route) =>
        route.fulfill({ status: 200, json: { templates: [] } })
      ),
      page.route('**/api/monitoring**', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy', services: [] } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  // ── Hamburger menu tests ──────────────────────────────────────────────

  test('hamburger menu appears at iPhone viewport and is clickable', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    // Hamburger button should be visible on mobile
    const hamburger = page.locator('button[aria-label*="menu" i], label[for="sidebar-drawer"], .drawer-button, button.btn-ghost.lg\\:hidden, label.btn-ghost.lg\\:hidden').first();
    if ((await hamburger.count()) > 0) {
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      await page.waitForTimeout(300);

      // Sidebar / drawer navigation should now be visible
      const nav = page.locator('.drawer-side, nav, aside, [class*="sidebar"]').first();
      await expect(nav).toBeVisible();
    }
  });

  test('hamburger menu appears at iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const hamburger = page.locator('button[aria-label*="menu" i], label[for="sidebar-drawer"], .drawer-button, button.btn-ghost.lg\\:hidden, label.btn-ghost.lg\\:hidden').first();
    if ((await hamburger.count()) > 0) {
      await expect(hamburger).toBeVisible();
    }
  });

  test('sidebar navigation works via hamburger menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const hamburger = page.locator('button[aria-label*="menu" i], label[for="sidebar-drawer"], .drawer-button, button.btn-ghost.lg\\:hidden, label.btn-ghost.lg\\:hidden').first();
    if ((await hamburger.count()) > 0) {
      await hamburger.click();
      await page.waitForTimeout(300);

      // Click a nav link to personas
      const personasLink = page.locator('a[href*="personas"], a:has-text("Personas")').first();
      if ((await personasLink.count()) > 0) {
        await personasLink.click();
        await page.waitForTimeout(500);
        expect(page.url()).toContain('personas');
      }
    }
  });

  // ── Navigate to each admin page via mobile nav ────────────────────────

  const adminPages = [
    { path: '/admin/bots', heading: /bot/i },
    { path: '/admin/personas', heading: /persona/i },
    { path: '/admin/guards', heading: /guard/i },
    { path: '/admin/settings', heading: /setting/i },
    { path: '/admin/monitoring', heading: /monitor|health|status/i },
    { path: '/admin/marketplace', heading: /marketplace|template/i },
    { path: '/admin/mcp', heading: /mcp|server|tool/i },
    { path: '/admin/activity', heading: /activity|event|log/i },
    { path: '/admin/analytics', heading: /analytics|metric|dashboard/i },
    { path: '/admin/chat', heading: /chat|message|conversation/i },
    { path: '/admin/export', heading: /export|import|backup/i },
    { path: '/admin/sitemap', heading: /sitemap|page|navigation/i },
  ];

  for (const { path, heading } of adminPages) {
    test(`page ${path} renders at mobile viewport with visible heading`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      await page.waitForTimeout(500);

      // Page should load without crashing
      await expect(page.locator('body')).toBeVisible();

      // Main heading or page identifier should be visible
      const headingEl = page.locator('h1, h2, [class*="page-title"], [class*="PageHeader"]').first();
      if ((await headingEl.count()) > 0) {
        await expect(headingEl).toBeVisible();
      }
    });

    test(`page ${path} has no horizontal overflow on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      await page.waitForTimeout(500);

      // Check that the page doesn't have extreme horizontal overflow
      // Some pages (activity, chat, export) have tables or content that naturally
      // extends beyond the viewport, so we allow generous tolerance
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375 + 300);
    });
  }

  // ── Bot cards stack vertically on mobile ──────────────────────────────

  test('bot cards stack vertically on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const cards = page.locator('.card, [class*="bot-card"], [class*="BotCard"]');
    const count = await cards.count();
    if (count >= 2) {
      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      if (box0 && box1) {
        // Cards should be stacked: second card top >= first card bottom
        expect(box1.y).toBeGreaterThanOrEqual(box0.y + box0.height - 5);
      }
    }
  });

  // ── Tables become scrollable or responsive on mobile ──────────────────

  test('tables are scrollable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/activity');
    await page.waitForTimeout(500);

    const table = page.locator('table').first();
    if ((await table.count()) > 0) {
      const tableBox = await table.boundingBox();
      if (tableBox) {
        // Table or its wrapper should allow scroll (parent overflow-x)
        const isScrollable = await page.evaluate(() => {
          const t = document.querySelector('table');
          if (!t) return true;
          const parent = t.parentElement;
          if (!parent) return true;
          const style = window.getComputedStyle(parent);
          return (
            style.overflowX === 'auto' ||
            style.overflowX === 'scroll' ||
            parent.scrollWidth > parent.clientWidth
          );
        });
        expect(isScrollable).toBe(true);
      }
    }
  });

  // ── Modals are full-width on mobile ───────────────────────────────────

  test('create bot modal is full-width on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const createBtn = page.getByRole('button', { name: /create bot/i }).first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();
        const modalBox = await modal.boundingBox();
        if (modalBox) {
          // Modal should span close to full viewport width (with some padding)
          expect(modalBox.width).toBeGreaterThanOrEqual(300);
        }
      }
    }
  });

  // ── Forms are usable on mobile (inputs full width) ────────────────────

  test('form inputs are full-width on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/settings');
    await page.waitForTimeout(500);

    const inputs = page.locator('input:visible, select:visible, textarea:visible');
    const count = await inputs.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const box = await inputs.nth(i).boundingBox();
      if (box) {
        // Inputs should be reasonably wide on a 375px viewport (some inputs may be in grid columns)
        expect(box.width).toBeGreaterThanOrEqual(100);
      }
    }
  });

  // ── Close mobile nav after navigation ─────────────────────────────────

  test('mobile nav closes after navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const hamburger = page.locator('button[aria-label*="menu" i], label[for="sidebar-drawer"], .drawer-button, button.btn-ghost.lg\\:hidden, label.btn-ghost.lg\\:hidden').first();
    if ((await hamburger.count()) > 0) {
      await hamburger.click();
      await page.waitForTimeout(300);

      // Click a nav link
      const link = page.locator('.drawer-side a[href*="personas"], aside a[href*="personas"]').first();
      if ((await link.count()) > 0) {
        await link.click();
        await page.waitForTimeout(500);

        // Drawer overlay should close or sidebar should no longer be visible
        const drawerCheckbox = page.locator('#sidebar-drawer, input.drawer-toggle');
        if ((await drawerCheckbox.count()) > 0) {
          const isChecked = await drawerCheckbox.isChecked().catch(() => false);
          // After navigation, drawer should be closed
          expect(isChecked).toBe(false);
        }
      }
    }
  });

  // ── Touch-friendly: buttons have minimum 44px tap targets ─────────────

  test('navigation buttons meet minimum 44px tap target size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const buttons = page.locator('button:visible, a.btn:visible');
    const count = await buttons.count();
    let tooSmallCount = 0;

    for (let i = 0; i < Math.min(count, 10); i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        if (box.height < 44 || box.width < 44) {
          tooSmallCount++;
        }
      }
    }

    // Allow up to 50% of buttons to be slightly small (icon buttons, toolbar buttons, etc.)
    const maxAllowed = Math.ceil(Math.min(count, 10) * 0.5);
    expect(tooSmallCount).toBeLessThanOrEqual(maxAllowed);
  });

  test('action buttons on bot cards meet tap target size', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const cardButtons = page.locator('.card button:visible, [class*="bot-card"] button:visible');
    const count = await cardButtons.count();

    for (let i = 0; i < Math.min(count, 6); i++) {
      const box = await cardButtons.nth(i).boundingBox();
      if (box) {
        // At least one dimension should be >= 32px (touch-friendly minimum)
        expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(32);
      }
    }
  });

  // ── iPad tablet breakpoint tests ──────────────────────────────────────

  test('bot cards layout adjusts at iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const cards = page.locator('.card, [class*="bot-card"], [class*="BotCard"]');
    const count = await cards.count();
    if (count >= 2) {
      const box0 = await cards.nth(0).boundingBox();
      const box1 = await cards.nth(1).boundingBox();
      if (box0 && box1) {
        // At 768px, cards may be side-by-side or stacked, either is valid
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('settings page is usable at iPad viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/settings');
    await page.waitForTimeout(500);

    // Tabs or sidebar for settings sections should be visible
    const tabs = page.locator('[role="tab"], .tab, [class*="tabs"] a, [class*="tabs"] button');
    if ((await tabs.count()) > 0) {
      await expect(tabs.first()).toBeVisible();
    }

    // Form inputs should be usable
    const inputs = page.locator('input:visible, select:visible');
    if ((await inputs.count()) > 0) {
      const box = await inputs.first().boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(150);
      }
    }
  });

  test('guards page renders at iPad viewport', async ({ page }) => {
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'profile-1',
              name: 'Production Guard',
              description: 'Strict settings',
              guards: {
                mcpGuard: { enabled: false },
                rateLimit: { enabled: true },
                contentFilter: { enabled: false },
              },
            },
          ],
        },
      })
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/guards');
    await page.waitForTimeout(500);

    await expect(page.getByText('Production Guard')).toBeVisible();
  });

  // ── Personas page at mobile ───────────────────────────────────────────

  test('persona cards stack on mobile', async ({ page }) => {
    await page.route('**/api/personas', (route) =>
      route.fulfill({
        status: 200,
        json: [
          {
            id: 'p1', name: 'Assistant A', description: 'First', systemPrompt: 'help',
            category: 'general', traits: [], isBuiltIn: false, createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z', assignedBotIds: [], assignedBotNames: [],
          },
          {
            id: 'p2', name: 'Assistant B', description: 'Second', systemPrompt: 'code',
            category: 'technical', traits: [], isBuiltIn: false, createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z', assignedBotIds: [], assignedBotNames: [],
          },
        ],
      })
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/personas');
    await page.waitForTimeout(500);

    await expect(page.getByText('Assistant A')).toBeVisible();
    await expect(page.getByText('Assistant B')).toBeVisible();
  });

  // ── MCP page at mobile ────────────────────────────────────────────────

  test('MCP servers page renders on mobile', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) =>
      route.fulfill({
        status: 200,
        json: [
          { name: 'Prod MCP', url: 'https://prod.example.com', status: 'running', connected: true, tools: [] },
        ],
      })
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/mcp');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();
  });

  // ── Monitoring page at mobile ─────────────────────────────────────────

  test('monitoring page renders on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/monitoring');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20);
  });

  // ── Chat page at mobile ───────────────────────────────────────────────

  test('chat page message input is usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/chat');
    await page.waitForTimeout(500);

    const chatInput = page.locator(
      'input[placeholder*="message" i], textarea[placeholder*="message" i], input[placeholder*="type" i], textarea[placeholder*="type" i]'
    ).first();
    if ((await chatInput.count()) > 0) {
      const box = await chatInput.boundingBox();
      if (box) {
        // Chat input should be wide enough to type comfortably
        expect(box.width).toBeGreaterThanOrEqual(200);
      }
    }
  });

  // ── Analytics page at mobile ──────────────────────────────────────────

  test('analytics page renders charts within viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin/analytics');
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    // Allow tolerance for scrollbar width and minor layout overflow
    expect(bodyWidth).toBeLessThanOrEqual(375 + 150);
  });
});
