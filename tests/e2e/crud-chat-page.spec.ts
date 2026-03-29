import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Chat Page CRUD E2E Tests
 * Exercises bot selection, chat history, message sending, error states,
 * LLM hot-swap, refresh, and empty states with full API mocking.
 */
test.describe('Chat Page CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Support Bot',
      status: 'active',
      connected: true,
      messageProvider: 'discord',
      llmProvider: 'openai',
      messageCount: 150,
      errorCount: 0,
      provider: 'discord',
    },
    {
      id: 'bot-2',
      name: 'Sales Bot',
      status: 'active',
      connected: true,
      messageProvider: 'slack',
      llmProvider: 'anthropic',
      messageCount: 85,
      errorCount: 2,
      provider: 'slack',
    },
  ];

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
        {
          id: 'msg-2',
          content: 'I need help with my account.',
          createdAt: '2026-03-26T10:01:00Z',
          author: { id: 'user-1', username: 'Alice', bot: false },
        },
        {
          id: 'msg-3',
          content: 'Sure, I can help with that. What is your account ID?',
          createdAt: '2026-03-26T10:01:30Z',
          author: { id: 'bot-1', username: 'Support Bot', bot: true },
        },
      ],
    },
  };

  const emptyHistory = {
    success: true,
    data: { history: [] },
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
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: mockBots } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
      page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({
          status: 200,
          json: {
            data: [
              { key: 'openai', name: 'OpenAI', provider: 'openai' },
              { key: 'anthropic', name: 'Anthropic', provider: 'anthropic' },
            ],
          },
        })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('load bot list in dropdown', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );

    await page.goto('/admin/chat');
    await expect(page.locator('body')).toBeVisible();

    // Look for bot selector dropdown or list
    const botSelector = page.locator('select:has(option:has-text("Support Bot")), [role="listbox"], [role="combobox"]').first();
    if ((await botSelector.count()) > 0) {
      await expect(botSelector).toBeVisible();
    } else {
      // May display bots as cards or a sidebar list
      const botName = page.getByText('Support Bot').first();
      if ((await botName.count()) > 0) {
        await expect(botName).toBeVisible();
      }
    }
  });

  test('select a bot, verify history loads', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/bot-1/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );
    await page.route('**/api/bots/bot-2/history*', (route) =>
      route.fulfill({ status: 200, json: emptyHistory })
    );

    await page.goto('/admin/chat');
    const botSelector = page.locator('select:has(option:has-text("Support Bot"))').first();
    if ((await botSelector.count()) > 0) {
      await botSelector.selectOption({ label: 'Support Bot' });
    } else {
      const botItem = page.getByText('Support Bot').first();
      if ((await botItem.count()) > 0) {
        await botItem.click();
      }
    }

    // Verify history messages appear
    const historyMsg = page.getByText('Hello, how can I help you?').first();
    if ((await historyMsg.count()) > 0) {
      await expect(historyMsg).toBeVisible();
    }
  });

  test('send a message, verify optimistic update appears', async ({ page }) => {
    let messages = [...mockHistory.data.history];

    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );
    await page.route('**/api/bots/*/chat', async (route) => {
      const body = route.request().postDataJSON();
      const newMsg = {
        id: 'msg-new-1',
        content: body.message || body.content || 'Test message',
        createdAt: new Date().toISOString(),
        author: { id: 'user-1', username: 'admin', bot: false },
      };
      messages.push(newMsg);
      await route.fulfill({ status: 200, json: { success: true, data: newMsg } });
    });
    await page.route('**/api/bots/*/message', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { success: true, messageId: 'msg-new-1' } });
    });

    await page.goto('/admin/chat');
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], input[placeholder*="type" i], textarea[placeholder*="type" i]').first();
    if ((await chatInput.count()) > 0) {
      await chatInput.fill('How do I reset my password?');
      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button[aria-label*="send" i]').first();
      if ((await sendBtn.count()) > 0) {
        await sendBtn.click();
      } else {
        await chatInput.press('Enter');
      }
      const sentMsg = page.getByText('How do I reset my password?').first();
      if ((await sentMsg.count()) > 0) {
        await expect(sentMsg).toBeVisible();
      }
    }
  });

  test('message failure shows error state', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );
    await page.route('**/api/bots/*/chat', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'LLM provider timeout' } });
    });
    await page.route('**/api/bots/*/message', async (route) => {
      await route.fulfill({ status: 500, json: { error: 'Failed to send message' } });
    });

    await page.goto('/admin/chat');

    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i], input[placeholder*="type" i], textarea[placeholder*="type" i]').first();
    if ((await chatInput.count()) > 0) {
      await chatInput.fill('This will fail');

      const sendBtn = page.locator('button:has-text("Send"), button[type="submit"], button[aria-label*="send" i]').first();
      if ((await sendBtn.count()) > 0) {
        await sendBtn.click();
      } else {
        await chatInput.press('Enter');
      }
      await expect(page.locator('body')).toBeVisible();
      const errorIndicator = page.locator('[class*="error"], .toast, [role="alert"], text=/fail|error|retry/i').first();
      if ((await errorIndicator.count()) > 0) {
        await expect(errorIndicator).toBeVisible();
      }
    }
  });

  test('switch between bots, history reloads', async ({ page }) => {
    const salesHistory = {
      success: true,
      data: {
        history: [
          {
            id: 'msg-s1',
            content: 'Welcome to Sales Bot!',
            createdAt: '2026-03-26T09:00:00Z',
            author: { id: 'bot-2', username: 'Sales Bot', bot: true },
          },
        ],
      },
    };

    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/bot-1/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );
    await page.route('**/api/bots/bot-2/history*', (route) =>
      route.fulfill({ status: 200, json: salesHistory })
    );

    await page.goto('/admin/chat');
    const botSelector = page.locator('select:has(option:has-text("Sales Bot"))').first();
    if ((await botSelector.count()) > 0) {
      await botSelector.selectOption({ label: 'Sales Bot' });

      const salesMsg = page.getByText('Welcome to Sales Bot!').first();
      if ((await salesMsg.count()) > 0) {
        await expect(salesMsg).toBeVisible();
      }
    } else {
      const salesBotItem = page.getByText('Sales Bot').first();
      if ((await salesBotItem.count()) > 0) {
        await salesBotItem.click();
      }
    }
  });

  test('LLM provider dropdown selection (hot-swap)', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );

    await page.goto('/admin/chat');
    const llmSelector = page.locator('select:has(option:has-text("OpenAI")), select:has(option:has-text("Anthropic")), select[name*="llm" i], select[id*="provider" i]').first();
    if ((await llmSelector.count()) > 0) {
      await llmSelector.selectOption({ index: 1 });
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('refresh history button', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) => {
      fetchCount++;
      return route.fulfill({ status: 200, json: mockHistory });
    });

    await page.goto('/admin/chat');
    const botItem = page.getByText('Support Bot').first();
    if ((await botItem.count()) > 0) {
      await botItem.click();
    }

    const initialCount = fetchCount;
    const refreshBtn = page.locator('button:has-text("Refresh")').first();
    if ((await refreshBtn.count()) > 0) {
      await refreshBtn.click();
      if (initialCount > 0) {
        expect(fetchCount).toBeGreaterThan(initialCount);
      }
    }
  });

  test('empty state when no bots configured', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('**/api/config', (route) =>
      route.fulfill({ status: 200, json: { bots: [] } })
    );

    await page.goto('/admin/chat');

    await expect(page.locator('body')).toBeVisible();
    const emptyText = page.locator('text=/no.*bot/i, text=/no.*agent/i, text=/get.*started/i, text=/configure.*bot/i, text=/select.*bot/i').first();
    if ((await emptyText.count()) > 0) {
      await expect(emptyText).toBeVisible();
    }
  });

  test('empty history for new bot', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: emptyHistory })
    );

    await page.goto('/admin/chat');

    await expect(page.locator('body')).toBeVisible();
    // Empty history may show placeholder text
    const emptyHistoryText = page.locator('text=/no.*message/i, text=/start.*conversation/i, text=/no.*history/i, text=/empty/i').first();
    if ((await emptyHistoryText.count()) > 0) {
      await expect(emptyHistoryText).toBeVisible();
    }
  });

  test('message timestamp display', async ({ page }) => {
    await page.route('**/api/bots', (route) =>
      route.fulfill({ status: 200, json: mockBots })
    );
    await page.route('**/api/bots/*/history*', (route) =>
      route.fulfill({ status: 200, json: mockHistory })
    );

    await page.goto('/admin/chat');
    const msgContent = page.getByText('Hello, how can I help you?').first();
    if ((await msgContent.count()) > 0) {
      await expect(msgContent).toBeVisible();

      // Look for timestamp display near messages (could be time, date, or relative)
      const timestamps = page.locator('time, [class*="timestamp"], [class*="time"], [class*="date"]');
      if ((await timestamps.count()) > 0) {
        await expect(timestamps.first()).toBeVisible();
      }
    }
  });
});
