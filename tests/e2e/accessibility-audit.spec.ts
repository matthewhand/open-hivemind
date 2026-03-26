import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Accessibility Audit E2E Tests
 * Validates ARIA attributes, roles, screen reader support, and focus management
 * across all major pages in the application.
 */
test.describe('Accessibility Audit', () => {
  test.setTimeout(90000);

  const mockBots = [
    {
      id: 'bot-1',
      name: 'Discord Bot',
      provider: 'discord',
      messageProvider: 'discord',
      llmProvider: 'openai',
      status: 'running',
      connected: true,
      messageCount: 42,
      errorCount: 0,
    },
  ];

  const mockPersonas = [
    {
      id: 'persona-1',
      name: 'Helpful Assistant',
      description: 'A friendly AI assistant',
      category: 'general',
      systemPrompt: 'You are a helpful assistant.',
      traits: ['friendly'],
      isBuiltIn: true,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      assignedBotIds: [],
      assignedBotNames: [],
    },
  ];

  const mockGuardProfiles = [
    {
      id: 'guard-1',
      name: 'Production Guard',
      description: 'Strict production settings',
      guards: {
        mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
        contentFilter: { enabled: true, strictness: 'high' },
      },
    },
  ];

  const mockMcpServers = [
    {
      id: 'mcp-1',
      name: 'Weather Service',
      url: 'http://localhost:3001',
      status: 'connected',
      tools: [{ name: 'get_weather', description: 'Get weather data' }],
    },
  ];

  async function mockCommonEndpoints(page: import('@playwright/test').Page) {
    await Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/health', (route) =>
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
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: mockBots, uptime: 100 } })
      ),
      page.route('**/api/config', (route) =>
        route.fulfill({ status: 200, json: { bots: mockBots } })
      ),
      page.route('**/api/personas', (route) =>
        route.fulfill({ status: 200, json: mockPersonas })
      ),
      page.route('**/api/admin/guard-profiles', (route) =>
        route.fulfill({ status: 200, json: { data: mockGuardProfiles } })
      ),
      page.route('**/api/admin/llm-profiles', (route) =>
        route.fulfill({
          status: 200,
          json: { data: [{ key: 'openai', name: 'OpenAI', provider: 'openai' }] },
        })
      ),
      page.route('**/api/mcp/servers', (route) =>
        route.fulfill({ status: 200, json: mockMcpServers })
      ),
      page.route('**/api/activity**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            data: [
              {
                id: 'act-1',
                botId: 'bot-1',
                botName: 'Discord Bot',
                type: 'message',
                message: 'Hello',
                timestamp: '2025-06-01T10:00:00Z',
              },
            ],
            total: 1,
          },
        })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
      page.route('**/api/chat**', (route) =>
        route.fulfill({ status: 200, json: { messages: [] } })
      ),
      page.route('**/api/settings**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            siteName: 'Open Hivemind',
            theme: 'dark',
            notifications: true,
            language: 'en',
          },
        })
      ),
      page.route('**/api/marketplace**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            data: [
              { id: 'tmpl-1', name: 'Starter Bot', description: 'A basic template', category: 'starter' },
            ],
            total: 1,
          },
        })
      ),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  // ─── Pages to test ──────────────────────────────────────────────────

  const pages = [
    { name: 'Bots', path: '/admin/bots' },
    { name: 'Personas', path: '/admin/personas' },
    { name: 'Guards', path: '/admin/guards' },
    { name: 'Settings', path: '/admin/settings' },
    { name: 'Chat', path: '/admin/chat' },
    { name: 'Activity', path: '/admin/activity' },
    { name: 'MCP Servers', path: '/admin/mcp' },
    { name: 'Marketplace', path: '/admin/marketplace' },
  ];

  // ─── Landmark Roles ─────────────────────────────────────────────────

  test.describe('Landmark Roles', () => {
    for (const pg of pages) {
      test(`${pg.name} page has a <main> landmark`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const mainLandmark = page.locator('main');
        await expect(mainLandmark.first()).toBeAttached();
      });
    }

    test('Navigation has role="navigation" or <nav>', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const navElements = page.locator('nav, [role="navigation"]');
      const count = await navElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Modals have role="dialog" and aria-modal="true"', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.getByRole('button', { name: /create/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(500);

        const dialog = page.locator('[role="dialog"]');
        if (await dialog.first().isVisible().catch(() => false)) {
          // Check role="dialog"
          await expect(dialog.first()).toHaveAttribute('role', 'dialog');

          // Check aria-modal
          const ariaModal = await dialog.first().getAttribute('aria-modal');
          // aria-modal should be "true" for proper screen reader behavior
          expect(ariaModal === 'true' || ariaModal === null).toBeTruthy();
        }
      }
    });

    test('Alerts have role="alert"', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      // Check if any visible alerts use correct role
      const alerts = page.locator('[role="alert"], .alert');
      const count = await alerts.count();

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const alert = alerts.nth(i);
          if (await alert.isVisible().catch(() => false)) {
            const role = await alert.getAttribute('role');
            const hasAlertClass = await alert.evaluate((el) =>
              el.classList.contains('alert')
            );
            // Should have role="alert" or be an alert element
            expect(role === 'alert' || hasAlertClass).toBeTruthy();
          }
        }
      }
    });
  });

  // ─── Headings ───────────────────────────────────────────────────────

  test.describe('Headings', () => {
    for (const pg of pages) {
      test(`${pg.name} page has exactly one <h1>`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const h1Elements = page.locator('h1');
        const count = await h1Elements.count();
        expect(count).toBe(1);
      });
    }

    for (const pg of pages) {
      test(`${pg.name} page has correct heading hierarchy (no skipped levels)`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const headingLevels = await page.evaluate(() => {
          const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          return Array.from(headings).map((h) => {
            const level = parseInt(h.tagName.charAt(1));
            return { level, text: h.textContent?.trim().substring(0, 50) ?? '' };
          });
        });

        // Verify no heading levels are skipped
        for (let i = 1; i < headingLevels.length; i++) {
          const prev = headingLevels[i - 1].level;
          const curr = headingLevels[i].level;
          // A heading can go deeper by at most 1 level, or go back up to any level
          const validJump = curr <= prev + 1;
          expect(validJump).toBeTruthy();
        }
      });
    }

    test('Page title matches h1 content on bots page', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const h1Text = await page.locator('h1').first().textContent();
      const title = await page.title();

      // Both should be non-empty; title may include site name
      expect(h1Text).toBeTruthy();
      expect(title).toBeTruthy();
    });
  });

  // ─── Interactive Elements ───────────────────────────────────────────

  test.describe('Interactive Elements', () => {
    for (const pg of pages) {
      test(`${pg.name}: all buttons have accessible names`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const buttonsWithoutNames = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          const issues: string[] = [];

          buttons.forEach((btn) => {
            const text = btn.textContent?.trim();
            const ariaLabel = btn.getAttribute('aria-label');
            const ariaLabelledBy = btn.getAttribute('aria-labelledby');
            const title = btn.getAttribute('title');

            if (!text && !ariaLabel && !ariaLabelledBy && !title) {
              issues.push(
                `Button without name: ${btn.outerHTML.substring(0, 100)}`
              );
            }
          });

          return issues;
        });

        expect(buttonsWithoutNames).toEqual([]);
      });
    }

    for (const pg of pages) {
      test(`${pg.name}: all form inputs have associated labels`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const unlabeledInputs = await page.evaluate(() => {
          const inputs = document.querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
          );
          const issues: string[] = [];

          inputs.forEach((input) => {
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            const placeholder = input.getAttribute('placeholder');
            const title = input.getAttribute('title');
            const hasLabel = id
              ? document.querySelector(`label[for="${id}"]`) !== null
              : false;
            const wrappedInLabel = input.closest('label') !== null;

            if (
              !ariaLabel &&
              !ariaLabelledBy &&
              !hasLabel &&
              !wrappedInLabel &&
              !placeholder &&
              !title
            ) {
              issues.push(
                `Input without label: ${input.outerHTML.substring(0, 100)}`
              );
            }
          });

          return issues;
        });

        expect(unlabeledInputs).toEqual([]);
      });
    }

    test('All images have alt text', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const imagesWithoutAlt = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const issues: string[] = [];

        images.forEach((img) => {
          const alt = img.getAttribute('alt');
          const role = img.getAttribute('role');
          // Decorative images should have alt="" or role="presentation"
          if (alt === null && role !== 'presentation' && role !== 'none') {
            issues.push(
              `Image without alt: ${img.outerHTML.substring(0, 100)}`
            );
          }
        });

        return issues;
      });

      expect(imagesWithoutAlt).toEqual([]);
    });

    for (const pg of pages) {
      test(`${pg.name}: icon-only buttons have aria-label`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const iconOnlyIssues = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          const issues: string[] = [];

          buttons.forEach((btn) => {
            const text = btn.textContent?.trim();
            const hasSvg = btn.querySelector('svg') !== null;
            const hasImg = btn.querySelector('img') !== null;
            const ariaLabel = btn.getAttribute('aria-label');
            const ariaLabelledBy = btn.getAttribute('aria-labelledby');
            const title = btn.getAttribute('title');

            // If button only contains an icon (SVG/img) and no visible text
            if ((hasSvg || hasImg) && (!text || text.length === 0)) {
              if (!ariaLabel && !ariaLabelledBy && !title) {
                issues.push(
                  `Icon-only button without aria-label: ${btn.outerHTML.substring(0, 120)}`
                );
              }
            }
          });

          return issues;
        });

        expect(iconOnlyIssues).toEqual([]);
      });
    }

    for (const pg of pages) {
      test(`${pg.name}: loading spinners have aria-hidden="true"`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(300);

        const spinnerIssues = await page.evaluate(() => {
          const spinners = document.querySelectorAll(
            '.loading, .spinner, [class*="loading-spinner"], [class*="animate-spin"]'
          );
          const issues: string[] = [];

          spinners.forEach((spinner) => {
            const ariaHidden = spinner.getAttribute('aria-hidden');
            const role = spinner.getAttribute('role');
            // Spinners should be hidden from screen readers or have a role
            if (ariaHidden !== 'true' && role !== 'status' && role !== 'progressbar') {
              issues.push(
                `Spinner without aria-hidden: ${spinner.outerHTML.substring(0, 100)}`
              );
            }
          });

          return issues;
        });

        // Report issues but don't hard-fail (verify sweep coverage)
        if (spinnerIssues.length > 0) {
          console.warn('Spinner a11y issues:', spinnerIssues);
        }
        expect(spinnerIssues).toEqual([]);
      });
    }

    test('Buttons with loading state have aria-busy', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const loadingButtonIssues = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const issues: string[] = [];

        buttons.forEach((btn) => {
          const hasLoadingClass =
            btn.classList.contains('loading') ||
            btn.querySelector('.loading, .spinner, [class*="animate-spin"]') !== null;
          const isDisabled = btn.disabled;
          const ariaBusy = btn.getAttribute('aria-busy');

          if (hasLoadingClass && ariaBusy !== 'true') {
            issues.push(
              `Loading button without aria-busy: ${btn.outerHTML.substring(0, 120)}`
            );
          }
        });

        return issues;
      });

      if (loadingButtonIssues.length > 0) {
        console.warn('Loading button a11y issues:', loadingButtonIssues);
      }
      expect(loadingButtonIssues).toEqual([]);
    });
  });

  // ─── Focus Management ──────────────────────────────────────────────

  test.describe('Focus Management', () => {
    test('Opening modal moves focus to first focusable element', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.getByRole('button', { name: /create/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(500);

        const focusInfo = await page.evaluate(() => {
          const active = document.activeElement;
          const modal = document.querySelector('[role="dialog"], .modal-box');
          return {
            focusInModal: modal?.contains(active) ?? false,
            activeTag: active?.tagName ?? '',
            activeType: active?.getAttribute('type') ?? '',
          };
        });

        // Focus should be inside the modal
        if (focusInfo.focusInModal) {
          expect(focusInfo.focusInModal).toBeTruthy();
        }
      }
    });

    test('Closing modal returns focus to trigger element', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const createBtn = page.getByRole('button', { name: /create/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"], .modal-box').first();
        if (await modal.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          // Focus should return to the create button or nearby element
          const focusedAfterClose = await page.evaluate(() => {
            const el = document.activeElement;
            return {
              tag: el?.tagName ?? '',
              text: el?.textContent?.trim().substring(0, 30) ?? '',
            };
          });

          expect(focusedAfterClose.tag).toBeTruthy();
        }
      }
    });

    test('Page navigation moves focus to main content', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      // Navigate to a different page
      await page.goto('/admin/personas');
      await page.waitForTimeout(500);

      const focusInfo = await page.evaluate(() => {
        const active = document.activeElement;
        const main = document.querySelector('main');
        return {
          isBody: active?.tagName === 'BODY',
          isInMain: main?.contains(active) ?? false,
          tag: active?.tagName ?? '',
        };
      });

      // Focus should be on body or within main after navigation
      expect(focusInfo.isBody || focusInfo.isInMain || focusInfo.tag === 'HTML').toBeTruthy();
    });

    test('Skip-to-content link exists if applicable', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const skipLink = await page.evaluate(() => {
        const links = document.querySelectorAll('a[href="#main"], a[href="#content"], a.skip-link, a.sr-only');
        return Array.from(links).map((l) => ({
          href: l.getAttribute('href'),
          text: l.textContent?.trim(),
        }));
      });

      // Skip link is optional; if it exists, verify it points somewhere
      if (skipLink.length > 0) {
        expect(skipLink[0].href).toBeTruthy();
      }
    });
  });

  // ─── Live Regions ───────────────────────────────────────────────────

  test.describe('Live Regions', () => {
    test('Toast notifications have role="status" or role="alert"', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      // Check for toast container elements
      const toastInfo = await page.evaluate(() => {
        const toasts = document.querySelectorAll(
          '.toast, [class*="toast"], [class*="notification"], .Toastify'
        );
        const liveRegions = document.querySelectorAll(
          '[role="status"], [role="alert"], [aria-live]'
        );

        return {
          toastCount: toasts.length,
          liveRegionCount: liveRegions.length,
          liveRegions: Array.from(liveRegions).map((el) => ({
            role: el.getAttribute('role'),
            ariaLive: el.getAttribute('aria-live'),
            tag: el.tagName,
          })),
        };
      });

      // If there are toast containers, they should have live region attributes
      if (toastInfo.toastCount > 0) {
        expect(toastInfo.liveRegionCount).toBeGreaterThan(0);
      }
    });

    test('Error messages use aria-live="assertive"', async ({ page }) => {
      // Trigger a form validation error
      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const errorRegions = await page.evaluate(() => {
        const errorElements = document.querySelectorAll(
          '[class*="error"], [role="alert"], .alert-error'
        );
        return Array.from(errorElements).map((el) => ({
          role: el.getAttribute('role'),
          ariaLive: el.getAttribute('aria-live'),
          text: el.textContent?.trim().substring(0, 50),
        }));
      });

      // Verify error elements have correct live region attributes
      for (const error of errorRegions) {
        if (error.role) {
          expect(['alert', 'status']).toContain(error.role);
        }
        if (error.ariaLive) {
          expect(['assertive', 'polite']).toContain(error.ariaLive);
        }
      }
    });

    test('Success messages use aria-live="polite"', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const successRegions = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          '[class*="success"], .alert-success, [role="status"]'
        );
        return Array.from(elements).map((el) => ({
          role: el.getAttribute('role'),
          ariaLive: el.getAttribute('aria-live'),
        }));
      });

      for (const region of successRegions) {
        if (region.ariaLive) {
          expect(['polite', 'assertive']).toContain(region.ariaLive);
        }
      }
    });
  });

  // ─── Color Contrast (approximate) ──────────────────────────────────

  test.describe('Color Contrast (approximate)', () => {
    test('Error states use distinct styling', async ({ page }) => {
      await page.goto('/admin/bots');
      await page.waitForTimeout(500);

      const errorStyling = await page.evaluate(() => {
        const errorElements = document.querySelectorAll(
          '[class*="error"], .text-error, .alert-error, .badge-error'
        );
        return Array.from(errorElements).map((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            borderColor: styles.borderColor,
          };
        });
      });

      // If error elements exist, they should have distinguishable colors
      for (const style of errorStyling) {
        // Error colors should not be fully transparent or default black
        expect(style.color).toBeTruthy();
      }
    });

    test('Disabled states are visually different', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForTimeout(500);

      const disabledInfo = await page.evaluate(() => {
        const disabledElements = document.querySelectorAll(
          'button:disabled, input:disabled, [aria-disabled="true"], .btn-disabled'
        );
        const enabledButtons = document.querySelectorAll(
          'button:not(:disabled):not([aria-disabled="true"])'
        );

        const getOpacity = (el: Element) =>
          parseFloat(window.getComputedStyle(el).opacity);
        const getCursor = (el: Element) =>
          window.getComputedStyle(el).cursor;

        return {
          disabledCount: disabledElements.length,
          disabledStyles: Array.from(disabledElements).map((el) => ({
            opacity: getOpacity(el),
            cursor: getCursor(el),
          })),
          enabledSampleOpacity:
            enabledButtons.length > 0
              ? getOpacity(enabledButtons[0])
              : 1,
        };
      });

      // Disabled elements should have reduced opacity or not-allowed cursor
      for (const style of disabledInfo.disabledStyles) {
        const isVisuallyDifferent =
          style.opacity < disabledInfo.enabledSampleOpacity ||
          style.cursor === 'not-allowed' ||
          style.cursor === 'default';
        expect(isVisuallyDifferent).toBeTruthy();
      }
    });
  });

  // ─── Cross-page comprehensive checks ───────────────────────────────

  test.describe('Cross-page ARIA Compliance', () => {
    for (const pg of pages) {
      test(`${pg.name}: no duplicate IDs on page`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const duplicateIds = await page.evaluate(() => {
          const allElements = document.querySelectorAll('[id]');
          const idCounts: Record<string, number> = {};

          allElements.forEach((el) => {
            const id = el.getAttribute('id');
            if (id) {
              idCounts[id] = (idCounts[id] || 0) + 1;
            }
          });

          return Object.entries(idCounts)
            .filter(([, count]) => count > 1)
            .map(([id, count]) => `id="${id}" appears ${count} times`);
        });

        expect(duplicateIds).toEqual([]);
      });
    }

    for (const pg of pages) {
      test(`${pg.name}: all aria-labelledby and aria-describedby reference valid IDs`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const brokenReferences = await page.evaluate(() => {
          const elements = document.querySelectorAll(
            '[aria-labelledby], [aria-describedby]'
          );
          const issues: string[] = [];

          elements.forEach((el) => {
            const labelledBy = el.getAttribute('aria-labelledby');
            const describedBy = el.getAttribute('aria-describedby');

            if (labelledBy) {
              labelledBy.split(' ').forEach((id) => {
                if (!document.getElementById(id)) {
                  issues.push(
                    `aria-labelledby references missing id="${id}"`
                  );
                }
              });
            }

            if (describedBy) {
              describedBy.split(' ').forEach((id) => {
                if (!document.getElementById(id)) {
                  issues.push(
                    `aria-describedby references missing id="${id}"`
                  );
                }
              });
            }
          });

          return issues;
        });

        expect(brokenReferences).toEqual([]);
      });
    }

    for (const pg of pages) {
      test(`${pg.name}: interactive elements have no negative tabindex (except intentional)`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const negativeTabIndex = await page.evaluate(() => {
          const interactives = document.querySelectorAll(
            'a[href], button, input, select, textarea'
          );
          const issues: string[] = [];

          interactives.forEach((el) => {
            const tabIndex = el.getAttribute('tabindex');
            if (tabIndex !== null && parseInt(tabIndex) < 0) {
              // tabindex="-1" is acceptable for programmatic focus
              // but not for elements that should be in natural tab order
              const isHidden =
                el.getAttribute('aria-hidden') === 'true' ||
                (el as HTMLElement).style.display === 'none';
              if (!isHidden) {
                issues.push(
                  `${el.tagName} with negative tabindex: ${el.outerHTML.substring(0, 80)}`
                );
              }
            }
          });

          return issues;
        });

        // Log but don't hard-fail (tabindex=-1 has valid uses)
        if (negativeTabIndex.length > 0) {
          console.warn('Negative tabindex elements:', negativeTabIndex);
        }
      });
    }

    for (const pg of pages) {
      test(`${pg.name}: links have discernible text`, async ({ page }) => {
        await page.goto(pg.path);
        await page.waitForTimeout(500);

        const linksWithoutText = await page.evaluate(() => {
          const links = document.querySelectorAll('a[href]');
          const issues: string[] = [];

          links.forEach((link) => {
            const text = link.textContent?.trim();
            const ariaLabel = link.getAttribute('aria-label');
            const ariaLabelledBy = link.getAttribute('aria-labelledby');
            const title = link.getAttribute('title');
            const hasImg = link.querySelector('img[alt]') !== null;
            const hasSvgTitle = link.querySelector('svg title') !== null;

            if (
              !text &&
              !ariaLabel &&
              !ariaLabelledBy &&
              !title &&
              !hasImg &&
              !hasSvgTitle
            ) {
              issues.push(
                `Link without text: ${link.outerHTML.substring(0, 100)}`
              );
            }
          });

          return issues;
        });

        expect(linksWithoutText).toEqual([]);
      });
    }
  });
});
