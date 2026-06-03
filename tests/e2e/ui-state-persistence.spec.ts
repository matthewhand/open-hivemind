import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth } from './test-utils';

/**
 * UI State Persistence E2E Tests
 *
 * Verifies that user preferences stored in localStorage survive:
 *   1. Page reload (same URL)
 *   2. Navigate away → navigate back
 *
 * Keys tested (all default false/null):
 *   ui.providerConfigForm.showAdvanced
 *   ui.personaSettings.showAdvanced
 *   ui.messageProviderSettings.showAdvanced
 *   ui.botSettings.showAdvanced
 *   ui.guardSettings.showAdvanced
 *   ui.componentTracker.showSuggestions
 *   ui.personaSelector.isExpanded
 *   ui.chat.sidebarOpen
 *   ui.llmProviders.expandedProfile
 *   ui.memoryProviders.expandedProfile
 *   ui.toolProviders.expandedProfile
 *   ui.responseProfiles.expandedProfile
 *   ui.messageProviders.expandedProfile
 */

test.describe('UI State Persistence', () => {
  test.setTimeout(60000);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function mockCommon(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health**', (r) => r.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/csrf-token', (r) => r.fulfill({ status: 200, json: { token: 'mock' } })),
      page.route('**/api/config/global', (r) => r.fulfill({ status: 200, json: {} })),
      page.route('**/api/demo/status', (r) => r.fulfill({ status: 200, json: { active: false } })),
      page.route('**/api/config/llm-status', (r) =>
        r.fulfill({
          status: 200,
          json: {
            defaultConfigured: true,
            defaultProviders: [],
            botsMissingLlmProvider: [],
            hasMissing: false,
          },
        })
      ),
    ]);
  }

  async function getLocalStorageItem(page: import('@playwright/test').Page, key: string) {
    return page.evaluate((k) => localStorage.getItem(k), key);
  }

  async function setLocalStorageItem(
    page: import('@playwright/test').Page,
    key: string,
    value: string
  ) {
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommon(page);
  });

  // ---------------------------------------------------------------------------
  // showAdvanced toggles
  // ---------------------------------------------------------------------------

  test.describe('showAdvanced toggles', () => {
    const cases: Array<{
      label: string;
      key: string;
      path: string;
      mockRoutes?: (p: import('@playwright/test').Page) => Promise<void>;
    }> = [
      {
        label: 'BotSettingsTab',
        key: 'ui.botSettings.showAdvanced',
        path: '/admin/bots',
        mockRoutes: async (p) => {
          await p.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
          await p.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
          await p.route('**/api/admin/llm-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
          await p.route('**/api/admin/guard-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
        },
      },
      {
        label: 'GuardSettingsTab',
        key: 'ui.guardSettings.showAdvanced',
        path: '/admin/guards?tab=settings',
        mockRoutes: async (p) => {
          await p.route('**/api/admin/guard-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
        },
      },
      {
        label: 'PersonaSettingsTab',
        key: 'ui.personaSettings.showAdvanced',
        path: '/admin/personas?tab=settings',
        mockRoutes: async (p) => {
          await p.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
          await p.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
          await p.route('**/api/admin/llm-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
          await p.route('**/api/admin/guard-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
        },
      },
      {
        label: 'MessageProviderSettingsTab',
        key: 'ui.messageProviderSettings.showAdvanced',
        path: '/admin/message-providers?tab=settings',
        mockRoutes: async (p) => {
          await p.route('**/api/config/message-profiles', (r) =>
            r.fulfill({ status: 200, json: { message: [] } })
          );
          await p.route('**/api/config/message**', (r) => r.fulfill({ status: 200, json: {} }));
          await p.route('**/api/marketplace/packages', (r) => r.fulfill({ status: 200, json: [] }));
        },
      },
    ];

    for (const { label, key, path, mockRoutes } of cases) {
      test(`${label}: defaults false, persists true across reload`, async ({ page }) => {
        if (mockRoutes) await mockRoutes(page);

        await navigateAndWaitReady(page, path);

        // Default should be false
        const initial = await getLocalStorageItem(page, key);
        expect(initial === null || initial === 'false').toBe(true);

        // Set to true
        await setLocalStorageItem(page, key, 'true');

        // Reload
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        const after = await getLocalStorageItem(page, key);
        expect(after).toBe('true');
      });

      test(`${label}: persists across navigate away and back`, async ({ page }) => {
        if (mockRoutes) await mockRoutes(page);
        await page.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
        await page.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
        await page.route('**/api/admin/llm-profiles', (r) =>
          r.fulfill({ status: 200, json: { data: [] } })
        );
        await page.route('**/api/admin/guard-profiles', (r) =>
          r.fulfill({ status: 200, json: { data: [] } })
        );

        await navigateAndWaitReady(page, path);
        await setLocalStorageItem(page, key, 'true');

        // Navigate away
        await navigateAndWaitReady(page, '/admin/bots');

        // Navigate back
        await navigateAndWaitReady(page, path);

        const after = await getLocalStorageItem(page, key);
        expect(after).toBe('true');
      });
    }
  });

  // ---------------------------------------------------------------------------
  // showSuggestions (DaisyUIComponentTracker)
  // ---------------------------------------------------------------------------

  test.describe('showSuggestions (DaisyUIComponentTracker)', () => {
    const KEY = 'ui.componentTracker.showSuggestions';

    test('defaults false', async ({ page }) => {
      await navigateAndWaitReady(page, '/');
      const val = await getLocalStorageItem(page, KEY);
      expect(val === null || val === 'false').toBe(true);
    });

    test('persists true across reload', async ({ page }) => {
      await navigateAndWaitReady(page, '/');
      await setLocalStorageItem(page, KEY, 'true');
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      expect(await getLocalStorageItem(page, KEY)).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // PersonaSelector isExpanded
  // ---------------------------------------------------------------------------

  test.describe('PersonaSelector isExpanded', () => {
    const KEY = 'ui.personaSelector.isExpanded';

    test('defaults false', async ({ page }) => {
      await page.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
      await page.route('**/api/admin/llm-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/admin/guard-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );

      await navigateAndWaitReady(page, '/admin/bots');
      const val = await getLocalStorageItem(page, KEY);
      expect(val === null || val === 'false').toBe(true);
    });

    test('persists true across reload', async ({ page }) => {
      await page.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
      await page.route('**/api/admin/llm-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/admin/guard-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );

      await navigateAndWaitReady(page, '/admin/bots');
      await setLocalStorageItem(page, KEY, 'true');
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      expect(await getLocalStorageItem(page, KEY)).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // Chat sidebar open
  // ---------------------------------------------------------------------------

  test.describe('Chat sidebarOpen', () => {
    const KEY = 'ui.chat.sidebarOpen';

    test.beforeEach(async ({ page }) => {
      await page.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
      await page.route('**/api/chat/**', (r) =>
        r.fulfill({ status: 200, json: { success: true, data: { history: [] } } })
      );
    });

    test('defaults false', async ({ page }) => {
      await navigateAndWaitReady(page, '/admin/chat');
      const val = await getLocalStorageItem(page, KEY);
      expect(val === null || val === 'false').toBe(true);
    });

    test('persists true across reload', async ({ page }) => {
      await navigateAndWaitReady(page, '/admin/chat');
      await setLocalStorageItem(page, KEY, 'true');
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      expect(await getLocalStorageItem(page, KEY)).toBe('true');
    });

    test('persists across navigate away and back', async ({ page }) => {
      await page.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
      await page.route('**/api/admin/llm-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );
      await page.route('**/api/admin/guard-profiles', (r) =>
        r.fulfill({ status: 200, json: { data: [] } })
      );

      await navigateAndWaitReady(page, '/admin/chat');
      await setLocalStorageItem(page, KEY, 'true');
      await navigateAndWaitReady(page, '/admin/bots');
      await navigateAndWaitReady(page, '/admin/chat');
      expect(await getLocalStorageItem(page, KEY)).toBe('true');
    });
  });

  // ---------------------------------------------------------------------------
  // expandedProfile — provider pages
  // ---------------------------------------------------------------------------

  test.describe('expandedProfile persistence', () => {
    const providerCases: Array<{
      label: string;
      key: string;
      path: string;
      mockRoutes: (p: import('@playwright/test').Page) => Promise<void>;
    }> = [
      {
        label: 'LLMProvidersPage',
        key: 'ui.llmProviders.expandedProfile',
        path: '/admin/config',
        mockRoutes: async (p) => {
          await p.route('**/api/admin/llm-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
          await p.route('**/api/config/message-profiles', (r) =>
            r.fulfill({ status: 200, json: { message: [] } })
          );
          await p.route('**/api/marketplace/packages', (r) => r.fulfill({ status: 200, json: [] }));
        },
      },
      {
        label: 'MemoryProvidersPage',
        key: 'ui.memoryProviders.expandedProfile',
        path: '/admin/memory-providers',
        mockRoutes: async (p) => {
          await p.route('**/api/admin/memory-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
          await p.route('**/api/marketplace/packages', (r) => r.fulfill({ status: 200, json: [] }));
        },
      },
      {
        label: 'ToolProvidersPage',
        key: 'ui.toolProviders.expandedProfile',
        path: '/admin/tool-providers',
        mockRoutes: async (p) => {
          await p.route('**/api/admin/guard-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
          await p.route('**/api/marketplace/packages', (r) => r.fulfill({ status: 200, json: [] }));
        },
      },
      {
        label: 'ResponseProfilesPage',
        key: 'ui.responseProfiles.expandedProfile',
        path: '/admin/response-profiles',
        mockRoutes: async (p) => {
          await p.route('**/api/admin/response-profiles', (r) =>
            r.fulfill({ status: 200, json: { data: [] } })
          );
        },
      },
      {
        label: 'MessageProvidersPage',
        key: 'ui.messageProviders.expandedProfile',
        path: '/admin/message-providers',
        mockRoutes: async (p) => {
          await p.route('**/api/config/message-profiles', (r) =>
            r.fulfill({ status: 200, json: { message: [] } })
          );
          await p.route('**/api/marketplace/packages', (r) => r.fulfill({ status: 200, json: [] }));
          await p.route('**/api/config/message**', (r) => r.fulfill({ status: 200, json: {} }));
        },
      },
    ];

    for (const { label, key, path, mockRoutes } of providerCases) {
      test(`${label}: defaults null, persists profile key across reload`, async ({ page }) => {
        await mockRoutes(page);
        await navigateAndWaitReady(page, path);

        // Default null
        const initial = await getLocalStorageItem(page, key);
        expect(initial === null || initial === 'null').toBe(true);

        // Set a profile key
        await setLocalStorageItem(page, key, '"profile-abc"');
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        const after = await getLocalStorageItem(page, key);
        expect(after).toBe('"profile-abc"');
      });
    }
  });

  // ---------------------------------------------------------------------------
  // All keys default to off (regression guard)
  // ---------------------------------------------------------------------------

  test('all ui.* keys default to false/null on fresh session', async ({ page }) => {
    // Clear all ui.* keys before navigating
    await page.addInitScript(() => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ui.'))
        .forEach((k) => localStorage.removeItem(k));
    });

    await page.route('**/api/config', (r) => r.fulfill({ status: 200, json: { bots: [] } }));
    await page.route('**/api/personas', (r) => r.fulfill({ status: 200, json: [] }));
    await page.route('**/api/admin/llm-profiles', (r) =>
      r.fulfill({ status: 200, json: { data: [] } })
    );
    await page.route('**/api/admin/guard-profiles', (r) =>
      r.fulfill({ status: 200, json: { data: [] } })
    );

    await navigateAndWaitReady(page, '/admin/bots');

    const booleanKeys = [
      'ui.providerConfigForm.showAdvanced',
      'ui.personaSettings.showAdvanced',
      'ui.messageProviderSettings.showAdvanced',
      'ui.botSettings.showAdvanced',
      'ui.guardSettings.showAdvanced',
      'ui.componentTracker.showSuggestions',
      'ui.personaSelector.isExpanded',
      'ui.chat.sidebarOpen',
    ];

    for (const key of booleanKeys) {
      const val = await getLocalStorageItem(page, key);
      // Either not set yet (null) or explicitly false — never true on fresh load
      expect(val === null || val === 'false', `${key} should default to false/null`).toBe(true);
    }
  });
});
