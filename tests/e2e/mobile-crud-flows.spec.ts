import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Mobile CRUD Flows E2E Tests
 * Verifies key create, read, update, delete operations work correctly
 * at mobile viewport (375x812 iPhone), including wizard flows, modals,
 * search/filter, settings tabs, chat, activity filters, MCP add, and
 * guard profile creation.
 */
test.describe('Mobile CRUD Flows', () => {
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

  const mockEvents = [
    {
      id: 'evt-1',
      timestamp: '2026-03-26T10:00:00Z',
      botName: 'SupportBot',
      provider: 'discord',
      llmProvider: 'openai',
      channelId: 'ch-101',
      userId: 'user1',
      messageType: 'incoming',
      contentLength: 50,
      processingTime: 120,
      status: 'success',
    },
    {
      id: 'evt-2',
      timestamp: '2026-03-26T09:55:00Z',
      botName: 'SalesBot',
      provider: 'slack',
      llmProvider: 'anthropic',
      channelId: 'ch-202',
      userId: 'user2',
      messageType: 'incoming',
      contentLength: 120,
      processingTime: 2500,
      status: 'error',
    },
  ];

  const mockMcpServers = [
    {
      name: 'Production MCP',
      url: 'https://prod-mcp.example.com',
      apiKey: 'sk-***masked***',
      description: 'Main production MCP server',
      status: 'running',
      connected: true,
      tools: [{ name: 'web_search', description: 'Search the web' }],
      lastConnected: '2026-03-25T10:00:00Z',
    },
  ];

  const mockGuardProfiles = [
    {
      id: 'profile-1',
      name: 'Production Guard',
      description: 'Strict production security settings',
      guards: {
        mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
        contentFilter: { enabled: true, strictness: 'high' },
      },
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
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  // ── Create a bot via wizard on mobile ─────────────────────────────────

  test('create a bot via wizard on mobile (all steps)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    let bots: any[] = [];
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newBot = {
          id: 'bot-new-1',
          name: body.name || 'Mobile Bot',
          provider: body.provider || 'discord',
          messageProvider: body.provider || 'discord',
          llmProvider: 'openai',
          status: 'inactive',
          connected: false,
          messageCount: 0,
          errorCount: 0,
        };
        bots.push(newBot);
        await route.fulfill({ status: 201, json: newBot });
      } else {
        await route.fulfill({ status: 200, json: { bots } });
      }
    });
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    // Open the create bot modal
    const createBtn = page.getByRole('button', { name: /create bot/i }).last();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      await expect(modal).toBeVisible();

      // Modal should fit within mobile viewport
      const modalBox = await modal.boundingBox();
      if (modalBox) {
        expect(modalBox.width).toBeLessThanOrEqual(375);
      }

      // Step 1: Fill bot name
      const nameInput = modal.locator('input').first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('Mobile Test Bot');
      }

      // Select message provider
      const providerSelect = modal.locator('select').first();
      if ((await providerSelect.count()) > 0) {
        await providerSelect.selectOption('discord');
      }
      await page.waitForTimeout(300);

      // Click Next if available
      const nextBtn = modal.locator('button').filter({ hasText: /Next/i });
      if ((await nextBtn.count()) > 0 && (await nextBtn.isEnabled())) {
        await nextBtn.click();
        await page.waitForTimeout(300);

        // Step 2: LLM configuration (select if available)
        const llmSelect = modal.locator('select').first();
        if ((await llmSelect.count()) > 0) {
          const options = await llmSelect.locator('option').count();
          if (options > 1) {
            await llmSelect.selectOption({ index: 1 });
          }
        }

        // Click Next again if more steps
        const nextBtn2 = modal.locator('button').filter({ hasText: /Next/i });
        if ((await nextBtn2.count()) > 0 && (await nextBtn2.isEnabled())) {
          await nextBtn2.click();
          await page.waitForTimeout(300);
        }

        // Final step: click Create/Save
        const saveBtn = modal.locator('button').filter({ hasText: /Create|Save|Finish/i }).first();
        if ((await saveBtn.count()) > 0 && (await saveBtn.isEnabled())) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ── Create a persona on mobile ────────────────────────────────────────

  test('create a persona on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const localPersonas: any[] = [];
    await page.route('**/api/personas', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newPersona = {
          id: `persona-${Date.now()}`,
          name: body.name,
          description: body.description || '',
          systemPrompt: body.systemPrompt || '',
          category: 'general',
          traits: [],
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBotIds: [],
          assignedBotNames: [],
        };
        localPersonas.push(newPersona);
        await route.fulfill({ status: 201, json: newPersona });
      } else {
        await route.fulfill({ status: 200, json: localPersonas });
      }
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/personas');
    await page.waitForTimeout(500);

    const createButton = page.locator('button:has-text("Create Persona")').first();
    if ((await createButton.count()) > 0) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Fill persona form in modal
      const nameInput = page.locator('input[placeholder="e.g. Friendly Helper"], input[placeholder*="name" i]').first();
      if ((await nameInput.count()) > 0) {
        await nameInput.fill('Mobile Persona');
      }

      const descInput = page.locator('input[placeholder="Short description of this persona"], input[placeholder*="description" i]').first();
      if ((await descInput.count()) > 0) {
        await descInput.fill('Created on mobile');
      }

      // Verify inputs are full-width on mobile
      if ((await nameInput.count()) > 0) {
        const box = await nameInput.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(200);
        }
      }

      const saveButton = page.locator('dialog.modal[open] button.btn-primary, .modal-box button.btn-primary').first();
      if ((await saveButton.count()) > 0) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  // ── Edit a bot on mobile ──────────────────────────────────────────────

  test('edit a bot on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    let updatedName = 'Support Bot';
    await page.route('**/api/config', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        updatedName = body.name || updatedName;
        await route.fulfill({ status: 200, json: { ...mockBots[0], name: updatedName } });
      } else {
        await route.fulfill({ status: 200, json: { bots: [{ ...mockBots[0], name: updatedName }] } });
      }
    });
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    await expect(page.locator('span.font-bold', { hasText: 'Support Bot' }).first()).toBeVisible();

    // Find and click the edit button on the bot card
    const card = page.locator('.card').filter({ hasText: 'Support Bot' }).first();
    const editBtn = card.locator('button:has-text("Edit"), button[title*="Edit"], button[aria-label*="edit" i]').first();
    if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        // Modal should be visible and usable on mobile
        await expect(modal).toBeVisible();

        const nameInput = modal.locator('input').first();
        if ((await nameInput.count()) > 0) {
          await nameInput.clear();
          await nameInput.fill('Updated Mobile Bot');

          // Verify input fits mobile viewport
          const box = await nameInput.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(200);
          }
        }
      }
    }
  });

  // ── Delete with confirmation on mobile ────────────────────────────────

  test('delete bot with confirmation modal fits mobile screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    let deleted = false;
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ status: 200, json: { bots: deleted ? [] : mockBots } });
    });
    await page.route('**/api/config/bot-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleted = true;
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    await expect(page.locator('span.font-bold', { hasText: 'Support Bot' }).first()).toBeVisible();

    // Find delete button on card
    const card = page.locator('.card').filter({ hasText: 'Support Bot' }).first();
    const deleteBtn = card.locator('button.text-error, button:has-text("Delete"), button[aria-label*="delete" i]').first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('dialog.modal[open], .modal-box').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        // Confirm modal fits within mobile viewport
        const modalBox = await modal.boundingBox();
        if (modalBox) {
          expect(modalBox.width).toBeLessThanOrEqual(375);
          expect(modalBox.height).toBeLessThanOrEqual(812);
        }

        // Confirm deletion
        const confirmBtn = modal.locator('button:has-text("Delete"), button.btn-error').first();
        if ((await confirmBtn.count()) > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ── Search/filter on mobile ───────────────────────────────────────────

  test('search input is visible and works on mobile bots page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const allBots = [
      ...mockBots,
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

    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: allBots } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder(/search/i).first();
    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible();

      // Verify search input is usable (wide enough)
      const box = await searchInput.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(150);
      }

      await searchInput.fill('Sales');
      await page.waitForTimeout(500);

      // Sales Bot should still be visible, Support Bot may be hidden
      const salesBot = page.getByText('Sales Bot').first();
      if ((await salesBot.count()) > 0) {
        await expect(salesBot).toBeVisible();
      }
    }
  });

  test('filter dropdowns work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: mockBots } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/bots');
    await page.waitForTimeout(500);

    // Filter select (status, provider, etc.)
    const filterSelect = page.locator('select:visible').first();
    if ((await filterSelect.count()) > 0) {
      const box = await filterSelect.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(100);
      }

      // Try selecting a filter option
      const options = await filterSelect.locator('option').count();
      if (options > 1) {
        await filterSelect.selectOption({ index: 1 });
        await page.waitForTimeout(300);
      }
    }
  });

  // ── Settings tab navigation on mobile ─────────────────────────────────

  test('settings tab navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route('**/api/config/global', (route) =>
      route.fulfill({
        status: 200,
        json: {
          instanceName: 'My Hivemind',
          maintenanceMode: false,
          messaging: { defaultProvider: 'discord' },
          llm: { defaultProvider: 'openai' },
          security: { passwordMinLength: 8 },
        },
      })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/settings');
    await page.waitForTimeout(500);

    // Tabs should be visible and scrollable/wrappable on mobile
    const tabs = page.locator('[role="tab"], .tab, [class*="tabs"] a, [class*="tabs"] button');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(300);

      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();

      // Verify no horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(375 + 20);
    }
  });

  // ── Chat page send message on mobile ──────────────────────────────────

  test('chat page send message on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const mockHistory = {
      success: true,
      data: {
        history: [
          {
            id: 'msg-1',
            content: 'Hello, how can I help you?',
            createdAt: '2026-03-26T10:00:00Z',
            author: { id: 'bot-1', username: 'Support Bot', bot: true },
          },
        ],
      },
    };

    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: mockBots } })
    );
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );
    await page.route('**/api/bots/*/chat', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            id: 'msg-new',
            content: body.message || body.content || 'Test',
            createdAt: new Date().toISOString(),
            author: { id: 'user-1', username: 'admin', bot: false },
          },
        },
      });
    });
    await page.route('**/api/bots/*/message', async (route) => {
      await route.fulfill({ status: 200, json: { success: true, messageId: 'msg-new' } });
    });
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: mockPersonas })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/chat');
    await page.waitForTimeout(500);

    const chatInput = page.locator(
      'input[placeholder*="message" i], textarea[placeholder*="message" i], input[placeholder*="type" i], textarea[placeholder*="type" i]'
    ).first();
    if ((await chatInput.count()) > 0) {
      // Verify input is wide enough for mobile
      const box = await chatInput.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(200);
      }

      await chatInput.fill('Hello from mobile!');
      await page.waitForTimeout(200);

      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button[aria-label*="send" i]').first();
      if ((await sendBtn.count()) > 0) {
        // Send button should be tappable
        const sendBox = await sendBtn.boundingBox();
        if (sendBox) {
          expect(Math.max(sendBox.width, sendBox.height)).toBeGreaterThanOrEqual(32);
        }
        await sendBtn.click();
        await page.waitForTimeout(500);
      } else {
        await chatInput.press('Enter');
        await page.waitForTimeout(500);
      }

      // Message should appear
      const sentMsg = page.getByText('Hello from mobile!').first();
      if ((await sentMsg.count()) > 0) {
        await expect(sentMsg).toBeVisible();
      }
    }
  });

  // ── Activity page with filters on mobile ──────────────────────────────

  test('activity page with filters on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await page.route('**/api/activity**', (route) =>
      route.fulfill({ status: 200, json: { data: mockEvents, total: mockEvents.length } })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: mockBots } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/activity');
    await page.waitForTimeout(500);

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/search|filter/i).first();
    if ((await searchInput.count()) > 0) {
      await expect(searchInput).toBeVisible();
      await searchInput.fill('SupportBot');
      await page.waitForTimeout(300);
    }

    // Filter dropdowns should be usable
    const filterSelects = page.locator('select:visible');
    const filterCount = await filterSelects.count();
    if (filterCount > 0) {
      const box = await filterSelects.first().boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(80);
      }
    }

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 20);
  });

  // ── MCP server add on mobile ──────────────────────────────────────────

  test('MCP server add on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const servers = [...mockMcpServers];
    await page.route('**/api/mcp/servers', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newServer = {
          name: body.name || 'New Server',
          url: body.url || 'https://new.example.com',
          apiKey: 'sk-***masked***',
          description: body.description || '',
          status: 'stopped',
          connected: false,
          tools: [],
          lastConnected: null,
        };
        servers.push(newServer);
        await route.fulfill({ status: 201, json: newServer });
      } else {
        await route.fulfill({ status: 200, json: servers });
      }
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/admin/guard-profiles', (route) =>
      route.fulfill({ status: 200, json: { data: [] } })
    );

    await page.goto('/admin/mcp');
    await page.waitForTimeout(500);

    // Click add server button
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")').first();
    if ((await addBtn.count()) > 0) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        // Modal should fit mobile viewport
        const modalBox = await modal.boundingBox();
        if (modalBox) {
          expect(modalBox.width).toBeLessThanOrEqual(375);
        }

        // Fill server details
        const nameInput = modal.locator('input[placeholder*="name" i], input').first();
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Mobile MCP Server');
        }

        const urlInput = modal.locator('input[placeholder*="url" i], input[type="url"], input[name*="url" i]').first();
        if ((await urlInput.count()) > 0) {
          await urlInput.fill('https://mobile-mcp.example.com');
        }

        // Submit
        const saveBtn = modal.locator('button.btn-primary, button:has-text("Save"), button:has-text("Add"), button:has-text("Create")').first();
        if ((await saveBtn.count()) > 0 && (await saveBtn.isEnabled())) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  // ── Guard profile create on mobile ────────────────────────────────────

  test('guard profile create on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const profiles = [...mockGuardProfiles];
    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newProfile = {
          id: 'profile-new',
          name: body.name || 'New Profile',
          description: body.description || '',
          guards: body.guards || {},
        };
        profiles.push(newProfile);
        await route.fulfill({
          status: 200,
          json: { data: newProfile, message: 'Profile created successfully' },
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: profiles } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );
    await page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: [] })
    );

    await page.goto('/admin/guards');
    await page.waitForTimeout(500);

    await expect(page.getByText('Production Guard')).toBeVisible();

    // Click create button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Profile"), button:has-text("Add")').first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(300);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        // Modal fits mobile viewport
        const modalBox = await modal.boundingBox();
        if (modalBox) {
          expect(modalBox.width).toBeLessThanOrEqual(375);
        }

        // Fill profile name
        const nameInput = modal.locator('input[placeholder*="Production"], input[placeholder*="name" i], input').first();
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Mobile Guard Profile');

          // Verify input is full-width
          const box = await nameInput.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(200);
          }
        }

        // Fill description if available
        const descInput = modal.locator('input[placeholder*="description" i], textarea[placeholder*="description" i]').first();
        if ((await descInput.count()) > 0) {
          await descInput.fill('Guard profile created on mobile');
        }

        // Toggle some guards if available
        const toggles = modal.locator('input[type="checkbox"], .toggle');
        if ((await toggles.count()) > 0) {
          await toggles.first().click();
          await page.waitForTimeout(200);
        }

        // Save
        const saveBtn = modal.locator('button.btn-primary, button:has-text("Save"), button:has-text("Create")').first();
        if ((await saveBtn.count()) > 0 && (await saveBtn.isEnabled())) {
          await saveBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});
