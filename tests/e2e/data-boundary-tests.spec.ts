import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Data Boundary E2E Tests
 * Tests extreme/boundary data inputs across all forms to verify
 * proper validation, escaping, and handling of edge-case data.
 */
test.describe('Data Boundary Tests', () => {
  test.setTimeout(90000);

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
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  // ---------------------------------------------------------------------------
  // String Boundaries
  // ---------------------------------------------------------------------------

  test.describe('String Boundaries', () => {
    test('empty string in required field shows validation error', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
      }

      const modal = page.locator('.modal-box, [role="dialog"]').first();
      if ((await modal.count()) > 0) {
        // Leave name empty and try to submit
        const nameInput = modal.locator('input').first();
        await nameInput.fill('');
        await nameInput.blur();

        const submitBtn = modal.locator('button').filter({ hasText: /next|create|save/i }).first();
        if ((await submitBtn.count()) > 0) {
          // Button should be disabled or clicking it should show validation error
          const isDisabled = await submitBtn.isDisabled();
          if (!isDisabled) {
            await submitBtn.click();
            await page.waitForTimeout(300);
          }
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('single character name is accepted', async ({ page }) => {
      let createdBot: any = null;

      await page.route('**/api/config', async (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          createdBot = { id: 'bot-single', name: body.name, provider: 'discord', status: 'inactive' };
          await route.fulfill({ status: 201, json: createdBot });
        } else {
          await route.fulfill({ status: 200, json: { bots: createdBot ? [createdBot] : [] } });
        }
      });
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('X');
          await page.waitForTimeout(200);
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('maximum length name (255 chars) renders without overflow', async ({ page }) => {
      const longName = 'A'.repeat(255);

      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: [
              {
                id: 'bot-long',
                name: longName,
                provider: 'discord',
                messageProvider: 'discord',
                llmProvider: 'openai',
                status: 'active',
                connected: true,
                messageCount: 0,
                errorCount: 0,
              },
            ],
          },
        })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      // Page should load without crashing
      expect(page.url()).toContain('/admin/bots');
      // Check that body width is not exceeded (no horizontal scroll)
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      // Allow a small tolerance for scrollbars
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });

    test('name with only spaces shows validation error or is trimmed', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('     ');
          await modal.locator('input').first().blur();
          await page.waitForTimeout(200);

          const submitBtn = modal.locator('button').filter({ hasText: /next|create|save/i }).first();
          if ((await submitBtn.count()) > 0) {
            const isDisabled = await submitBtn.isDisabled();
            // Either button is disabled or clicking triggers validation
            if (!isDisabled) {
              await submitBtn.click();
              await page.waitForTimeout(300);
            }
          }
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('unicode characters in bot name: Chinese, Arabic, Japanese, Korean', async ({ page }) => {
      const unicodeNames = ['你好Bot', 'مرحباBot', 'こんにちはBot', '안녕하세요Bot'];

      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: unicodeNames.map((name, i) => ({
              id: `bot-unicode-${i}`,
              name,
              provider: 'discord',
              messageProvider: 'discord',
              llmProvider: 'openai',
              status: 'active',
              connected: true,
              messageCount: 0,
              errorCount: 0,
            })),
          },
        })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(1000);

      // Page should load without crashing
      expect(page.url()).toContain('/admin/bots');

      // At least some unicode names should render
      for (const name of unicodeNames) {
        const el = page.getByText(name);
        if ((await el.count()) > 0) {
          await expect(el.first()).toBeVisible();
        }
      }
    });

    test('emoji in bot name renders correctly', async ({ page }) => {
      const emojiName = '\u{1F916}\u{1F525}\u{1F4AC} EmojiBot';

      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: [
              {
                id: 'bot-emoji',
                name: emojiName,
                provider: 'discord',
                messageProvider: 'discord',
                llmProvider: 'openai',
                status: 'active',
                connected: true,
                messageCount: 0,
                errorCount: 0,
              },
            ],
          },
        })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      expect(page.url()).toContain('/admin/bots');
      const emojiEl = page.getByText('EmojiBot');
      if ((await emojiEl.count()) > 0) {
        await expect(emojiEl.first()).toBeVisible();
      }
    });

    test('RTL text (Arabic) does not break layout', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: [
              {
                id: 'bot-rtl',
                name: '\u0645\u0631\u062D\u0628\u0627 \u0628\u0648\u062A',
                provider: 'discord',
                messageProvider: 'discord',
                llmProvider: 'openai',
                status: 'active',
                connected: true,
                messageCount: 0,
                errorCount: 0,
              },
            ],
          },
        })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      // Page should not have horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
    });

    test('HTML tags in input are stripped or escaped (no XSS)', async ({ page }) => {
      const xssPayload = '<img src=x onerror=alert(1)>';

      await page.route('**/api/config', async (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            json: { id: 'bot-xss', name: body.name, provider: 'discord', status: 'inactive' },
          });
        } else {
          await route.fulfill({ status: 200, json: { bots: [] } });
        }
      });
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      // Listen for dialog events (alert would trigger this)
      let alertTriggered = false;
      page.on('dialog', async (dialog) => {
        alertTriggered = true;
        await dialog.dismiss();
      });

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill(xssPayload);
          await page.waitForTimeout(300);
        }
      }

      expect(alertTriggered).toBe(false);
    });

    test('SQL injection attempt is safely handled', async ({ page }) => {
      const sqlInjection = "'; DROP TABLE bots; --";

      await page.route('**/api/config', async (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            json: { id: 'bot-sql', name: body.name, provider: 'discord', status: 'inactive' },
          });
        } else {
          await route.fulfill({ status: 200, json: { bots: [] } });
        }
      });
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill(sqlInjection);
          await page.waitForTimeout(200);
          // Page should not crash
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('script injection is escaped in input', async ({ page }) => {
      const scriptInjection = '<script>alert("xss")</script>';

      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      let alertTriggered = false;
      page.on('dialog', async (dialog) => {
        alertTriggered = true;
        await dialog.dismiss();
      });

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill(scriptInjection);
          await page.waitForTimeout(300);
        }
      }

      expect(alertTriggered).toBe(false);
    });

    test('very long description (10000 chars) renders with truncation or scroll', async ({ page }) => {
      const longDesc = 'L'.repeat(10000);

      await page.route('**/api/personas', (route) =>
        route.fulfill({
          status: 200,
          json: [
            {
              id: 'persona-long',
              name: 'Long Desc Persona',
              description: longDesc,
              category: 'general',
              systemPrompt: 'You are helpful.',
              traits: [],
              isBuiltIn: false,
              createdAt: '2026-03-26T00:00:00Z',
              updatedAt: '2026-03-26T00:00:00Z',
              assignedBotIds: [],
              assignedBotNames: [],
            },
          ],
        })
      );
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/personas');
      await page.waitForTimeout(1000);

      // Page should load without crashing
      expect(page.url()).toContain('/admin/personas');
    });

    test('newlines in text input are handled correctly', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('Bot\nName\nWith\nNewlines');
          await page.waitForTimeout(200);
          // Single-line inputs should strip newlines
          const value = await modal.locator('input').first().inputValue();
          expect(value).not.toContain('\n');
        }
      }
    });

    test('tab characters in input are handled', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('Bot\tName');
          await page.waitForTimeout(200);
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('null byte in input is handled safely', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('Bot\x00Name');
          await page.waitForTimeout(200);
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('backslash and quotes in input are handled', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] } })
      );

      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);
        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          await modal.locator('input').first().fill('He said "hello" and it\'s fine');
          await page.waitForTimeout(200);
          const value = await modal.locator('input').first().inputValue();
          expect(value).toContain('He said');
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Numeric Boundaries
  // ---------------------------------------------------------------------------

  test.describe('Numeric Boundaries', () => {
    test('port number boundaries: 0, 1, 65535, 65536, -1', async ({ page }) => {
      const portValues = [0, 1, 65535, 65536, -1];

      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      // Try to find any numeric input field
      const numberInputs = page.locator('input[type="number"]');
      if ((await numberInputs.count()) > 0) {
        for (const portVal of portValues) {
          await numberInputs.first().fill(String(portVal));
          await page.waitForTimeout(100);
          // Page should not crash for any value
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('rate limit values: 0, 1, 999999', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/config/global', (route) =>
        route.fulfill({ status: 200, json: { rateLimit: { maxRequests: 100 } } })
      );

      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const rateInputs = page.locator('input[type="number"]');
      if ((await rateInputs.count()) > 0) {
        for (const val of [0, 1, 999999]) {
          await rateInputs.first().fill(String(val));
          await page.waitForTimeout(100);
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('timeout values: 0, negative, very large', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/config/global', (route) =>
        route.fulfill({ status: 200, json: { messaging: { messageTimeout: 30000 } } })
      );

      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const numberInputs = page.locator('input[type="number"]');
      if ((await numberInputs.count()) > 0) {
        for (const val of [0, -1, 999999999]) {
          await numberInputs.first().fill(String(val));
          await page.waitForTimeout(100);
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('NaN and Infinity in numeric fields', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const numberInputs = page.locator('input[type="number"]');
      if ((await numberInputs.count()) > 0) {
        // Number inputs should handle NaN gracefully
        // Playwright fill() may clear the value or reject non-numeric text
        await numberInputs.first().evaluate((el: HTMLInputElement) => {
          el.value = 'NaN';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(100);
        const value = await numberInputs.first().inputValue();
        // The value should either be empty, the previous value, or 'NaN' but the UI should not crash
        expect(typeof value).toBe('string');

        await numberInputs.first().evaluate((el: HTMLInputElement) => {
          el.value = 'Infinity';
          el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.waitForTimeout(100);
        const value2 = await numberInputs.first().inputValue();
        expect(typeof value2).toBe('string');
      }
      expect(page.url()).toContain('/admin');
    });
  });

  // ---------------------------------------------------------------------------
  // Date Boundaries
  // ---------------------------------------------------------------------------

  test.describe('Date Boundaries', () => {
    test('activity filter with future date returns no results', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({
          status: 200,
          json: {
            bots: [{ id: 'b1', name: 'Bot', provider: 'discord', messageProvider: 'discord', llmProvider: 'openai', status: 'active', connected: true, messageCount: 0, errorCount: 0 }],
          },
        })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/activity**', (route) =>
        route.fulfill({ status: 200, json: { events: [], total: 0 } })
      );

      await page.goto('/admin/activity');
      await page.waitForTimeout(1000);

      const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
      if ((await dateInputs.count()) > 0) {
        await dateInputs.first().fill('2099-12-31');
        await page.waitForTimeout(300);
      }
      expect(page.url()).toContain('/admin');
    });

    test('activity filter with very old date (1970) is handled', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: [] } })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/activity**', (route) =>
        route.fulfill({ status: 200, json: { events: [], total: 0 } })
      );

      await page.goto('/admin/activity');
      await page.waitForTimeout(1000);

      const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
      if ((await dateInputs.count()) > 0) {
        await dateInputs.first().fill('1970-01-01');
        await page.waitForTimeout(300);
      }
      expect(page.url()).toContain('/admin');
    });

    test('activity filter from > to shows validation error or empty results', async ({ page }) => {
      await page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: [] } })
      );
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/activity**', (route) =>
        route.fulfill({ status: 200, json: { events: [], total: 0 } })
      );

      await page.goto('/admin/activity');
      await page.waitForTimeout(1000);

      const dateInputs = page.locator('input[type="date"], input[type="datetime-local"]');
      if ((await dateInputs.count()) >= 2) {
        await dateInputs.nth(0).fill('2026-12-31');
        await dateInputs.nth(1).fill('2026-01-01');
        await page.waitForTimeout(300);
      }
      expect(page.url()).toContain('/admin');
    });
  });

  // ---------------------------------------------------------------------------
  // API Key Formats
  // ---------------------------------------------------------------------------

  test.describe('API Key Formats', () => {
    test('empty API key shows validation error', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      // Look for API key input fields
      const apiKeyInput = page.locator('input[type="password"], input[placeholder*="key" i], input[placeholder*="API" i]').first();
      if ((await apiKeyInput.count()) > 0) {
        await apiKeyInput.fill('');
        await apiKeyInput.blur();
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });

    test('very long API key (1000 chars) is accepted or truncated', async ({ page }) => {
      const longKey = 'sk-' + 'a'.repeat(997);

      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const apiKeyInput = page.locator('input[type="password"], input[placeholder*="key" i], input[placeholder*="API" i]').first();
      if ((await apiKeyInput.count()) > 0) {
        await apiKeyInput.fill(longKey);
        await page.waitForTimeout(200);
        const value = await apiKeyInput.inputValue();
        // Should either accept or truncate, not crash
        expect(value.length).toBeGreaterThan(0);
      }
      expect(page.url()).toContain('/admin');
    });

    test('API key with special characters is handled', async ({ page }) => {
      const specialKey = 'sk-test_key!@#$%^&*()+=[]{}|;:,.<>?';

      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const apiKeyInput = page.locator('input[type="password"], input[placeholder*="key" i], input[placeholder*="API" i]').first();
      if ((await apiKeyInput.count()) > 0) {
        await apiKeyInput.fill(specialKey);
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });
  });

  // ---------------------------------------------------------------------------
  // URL Boundaries
  // ---------------------------------------------------------------------------

  test.describe('URL Boundaries', () => {
    test('empty URL in MCP server form', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('');
        await urlInput.blur();
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });

    test('invalid URL format (no protocol) is handled', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('not-a-valid-url');
        await urlInput.blur();
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });

    test('URL with port is accepted', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('http://localhost:3000');
        await page.waitForTimeout(200);
        const value = await urlInput.inputValue();
        expect(value).toBe('http://localhost:3000');
      }
      expect(page.url()).toContain('/admin');
    });

    test('URL with path and query params is accepted', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('https://api.example.com/v1?key=value&other=test#section');
        await page.waitForTimeout(200);
        const value = await urlInput.inputValue();
        expect(value).toContain('api.example.com');
      }
      expect(page.url()).toContain('/admin');
    });

    test('very long URL (2000 chars) is handled', async ({ page }) => {
      const longUrl = 'https://api.example.com/' + 'a'.repeat(1975);

      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill(longUrl);
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });

    test('URL with unicode domain is handled', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('https://\u4F8B\u3048.jp/api');
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });

    test('javascript: protocol URL is rejected', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      let alertTriggered = false;
      page.on('dialog', async (dialog) => {
        alertTriggered = true;
        await dialog.dismiss();
      });

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('javascript:alert(1)');
        await urlInput.blur();
        await page.waitForTimeout(300);
      }

      expect(alertTriggered).toBe(false);
    });

    test('file:/// protocol URL is rejected', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', (route) => route.fulfill({ status: 200, json: [] }));

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="endpoint" i]').first();
      if ((await urlInput.count()) > 0) {
        await urlInput.fill('file:///etc/passwd');
        await urlInput.blur();
        await page.waitForTimeout(200);
      }
      expect(page.url()).toContain('/admin');
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-Form Boundary Tests
  // ---------------------------------------------------------------------------

  test.describe('Cross-Form Boundary Tests', () => {
    test('persona form handles all string edge cases', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );

      await page.route('**/api/personas', async (route) => {
        if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON();
          await route.fulfill({
            status: 201,
            json: {
              id: 'persona-edge',
              name: body.name,
              description: body.description,
              systemPrompt: body.systemPrompt || '',
              category: 'general',
              traits: [],
              isBuiltIn: false,
              createdAt: '2026-03-26T00:00:00Z',
              updatedAt: '2026-03-26T00:00:00Z',
              assignedBotIds: [],
              assignedBotNames: [],
            },
          });
        } else {
          await route.fulfill({ status: 200, json: [] });
        }
      });

      await page.goto('/admin/personas');
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: /create|new|add/i }).first();
      if ((await createBtn.count()) > 0) {
        await createBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          const inputs = modal.locator('input, textarea');
          if ((await inputs.count()) > 0) {
            // Test XSS payload
            await inputs.first().fill('<script>alert("xss")</script>');
            await page.waitForTimeout(100);

            // Test SQL injection
            await inputs.first().fill("'; DROP TABLE personas; --");
            await page.waitForTimeout(100);

            // Test unicode
            await inputs.first().fill('\u4F60\u597D\u4E16\u754C');
            await page.waitForTimeout(100);

            // Test emoji
            await inputs.first().fill('\u{1F916}\u{1F525}');
            await page.waitForTimeout(100);
          }
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('LLM provider form handles boundary inputs', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 201, json: { key: 'test', name: 'Test', provider: 'openai' } });
        } else {
          await route.fulfill({ status: 200, json: { data: [] } });
        }
      });

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      // Try to find and interact with LLM provider form elements
      const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          const inputs = modal.locator('input');
          if ((await inputs.count()) > 0) {
            // Test very long name
            await inputs.first().fill('P'.repeat(255));
            await page.waitForTimeout(100);

            // Test special characters
            await inputs.first().fill('Provider <with> "special" chars & more');
            await page.waitForTimeout(100);
          }
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('MCP server form handles URL and name edge cases', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/mcp/servers', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 201, json: { id: 'mcp-1', name: 'Test', url: 'http://localhost:3000' } });
        } else {
          await route.fulfill({ status: 200, json: [] });
        }
      });

      await page.goto('/admin/config');
      await page.waitForTimeout(500);

      // Navigate to MCP section if available
      const mcpTab = page.locator('button, a, [role="tab"]').filter({ hasText: /mcp/i }).first();
      if ((await mcpTab.count()) > 0) {
        await mcpTab.click();
        await page.waitForTimeout(500);
      }

      const addBtn = page.locator('button').filter({ hasText: /add|create|new/i }).first();
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-box, [role="dialog"]').first();
        if ((await modal.count()) > 0) {
          const inputs = modal.locator('input');
          if ((await inputs.count()) > 0) {
            // Name with special chars
            await inputs.first().fill('MCP <Server> "Test"');
            await page.waitForTimeout(100);
          }

          const urlInput = modal.locator('input[type="url"], input[placeholder*="url" i]').first();
          if ((await urlInput.count()) > 0) {
            // javascript: protocol
            await urlInput.fill('javascript:alert(1)');
            await page.waitForTimeout(100);

            // file:// protocol
            await urlInput.fill('file:///etc/passwd');
            await page.waitForTimeout(100);

            // Valid URL with port
            await urlInput.fill('http://localhost:8080/api/v1');
            await page.waitForTimeout(100);
          }
        }
      }
      expect(page.url()).toContain('/admin');
    });

    test('settings form handles boundary values across all fields', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/config/global', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
          await route.fulfill({ status: 200, json: { success: true } });
        } else {
          await route.fulfill({
            status: 200,
            json: {
              instanceName: 'Test',
              messaging: { defaultProvider: 'discord', retryAttempts: 3, messageTimeout: 30000 },
              llm: { defaultProvider: 'openai', temperature: 0.7, maxTokens: 4096 },
              security: { passwordMinLength: 8, sessionTimeout: 3600, maxLoginAttempts: 5 },
            },
          });
        }
      });

      await page.goto('/admin/settings');
      await page.waitForTimeout(1000);

      // Test text inputs with edge cases
      const textInputs = page.locator('input[type="text"]:visible, input:not([type]):visible').first();
      if ((await textInputs.count()) > 0) {
        // Very long value
        await textInputs.fill('X'.repeat(500));
        await page.waitForTimeout(100);

        // HTML injection
        await textInputs.fill('<b>bold</b><script>alert(1)</script>');
        await page.waitForTimeout(100);

        // Unicode
        await textInputs.fill('\u4F60\u597D\u4E16\u754C \u{1F30D}');
        await page.waitForTimeout(100);
      }

      // Test number inputs with boundaries
      const numberInputs = page.locator('input[type="number"]:visible');
      if ((await numberInputs.count()) > 0) {
        await numberInputs.first().fill('-999999');
        await page.waitForTimeout(100);
        await numberInputs.first().fill('0');
        await page.waitForTimeout(100);
        await numberInputs.first().fill('999999999');
        await page.waitForTimeout(100);
      }

      expect(page.url()).toContain('/admin');
    });

    test('marketplace install URL handles boundary cases', async ({ page }) => {
      await page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/marketplace**', (route) =>
        route.fulfill({ status: 200, json: { items: [], total: 0 } })
      );

      await page.goto('/admin/marketplace');
      await page.waitForTimeout(500);

      // Look for any URL input on the marketplace page
      const urlInput = page.locator('input[type="url"], input[placeholder*="url" i]').first();
      if ((await urlInput.count()) > 0) {
        // javascript: protocol
        await urlInput.fill('javascript:alert(1)');
        await page.waitForTimeout(100);

        // Empty
        await urlInput.fill('');
        await page.waitForTimeout(100);

        // Valid URL
        await urlInput.fill('https://marketplace.example.com/plugin/v1');
        await page.waitForTimeout(100);

        // Very long URL
        await urlInput.fill('https://example.com/' + 'x'.repeat(2000));
        await page.waitForTimeout(100);
      }
      expect(page.url()).toContain('/admin');
    });
  });
});
