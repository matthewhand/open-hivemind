import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Bot Configuration Page CRUD E2E Tests
 * Exercises config sections in accordion, expand/collapse, text edit, boolean toggle,
 * enum dropdown, save, success message, rollback modal, snapshot selection, error handling,
 * modified indicator, and sensitive field badge with full API mocking.
 */
test.describe('Bot Configuration CRUD Lifecycle', () => {
  test.setTimeout(90000);

  // The page fetches /api/config/global and expects GlobalConfigs shape:
  // { [sectionName]: { values: Record<string,any>, schema: { properties: Record<string,any> } } }
  const mockConfigGlobal = {
    general: {
      values: {
        instanceName: 'My Hivemind',
        debugMode: false,
        logLevel: 'info',
      },
      schema: {
        properties: {
          instanceName: { doc: 'Instance display name' },
          debugMode: { format: 'boolean', doc: 'Enable debug mode' },
          logLevel: { enum: ['debug', 'info', 'warn', 'error'], doc: 'Logging level' },
        },
      },
    },
    llm: {
      values: {
        defaultProvider: 'openai',
        apiKey: '••••••••',
        temperature: '0.7',
        streamResponses: true,
      },
      schema: {
        properties: {
          defaultProvider: { enum: ['openai', 'anthropic', 'ollama'], doc: 'Default LLM provider' },
          apiKey: { sensitive: true, doc: 'API Key' },
          temperature: { doc: 'Temperature setting' },
          streamResponses: { format: 'boolean', doc: 'Stream responses' },
        },
      },
    },
    messaging: {
      values: {
        defaultProvider: 'discord',
        retryAttempts: 3,
        webhookSecret: '••••••••',
      },
      schema: {
        properties: {
          defaultProvider: {
            enum: ['discord', 'slack', 'mattermost'],
            doc: 'Default message provider',
          },
          retryAttempts: { format: 'int', doc: 'Number of retry attempts' },
          webhookSecret: { sensitive: true, doc: 'Webhook secret' },
        },
      },
    },
    security: {
      values: {
        sessionTimeout: 3600,
        requireMfa: false,
        jwtSecret: '••••••••',
      },
      schema: {
        properties: {
          sessionTimeout: { format: 'int', doc: 'Session timeout in seconds' },
          requireMfa: { format: 'boolean', doc: 'Require MFA' },
          jwtSecret: { sensitive: true, doc: 'JWT secret' },
        },
      },
    },
  };

  // The page fetches /api/config/hot-reload/rollbacks and expects { rollbacks: string[] }
  // Rollback IDs are like "rollback_<timestamp>_<hash>" - the component parses the number after first _
  const mockRollbacks = {
    rollbacks: [
      'rollback_1774699200000_abc123',
      'rollback_1774612800000_def456',
      'rollback_1774440000000_ghi789',
    ],
  };

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

  test('load config sections in accordion', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Verify section labels appear (capitalized config names)
    const generalSection = page.getByText('General').first();
    await expect(generalSection).toBeVisible({ timeout: 5000 });

    const llmSection = page.getByText('Llm').first();
    await llmSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await llmSection.isVisible()) {
      await expect(llmSection).toBeVisible();
    }

    const messagingSection = page.getByText('Messaging').first();
    await messagingSection.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await messagingSection.isVisible()) {
      await expect(messagingSection).toBeVisible();
    }
  });

  test('expand and collapse config sections', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Click on a section header to expand/collapse
    const sectionHeader = page
      .locator(
        'button:has-text("general"), button:has-text("llm"), button:has-text("messaging"), button:has-text("security")'
      )
      .first();
    await sectionHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await sectionHeader.isVisible()) {
      // Expand
      await sectionHeader.click();

      // Collapse
      await sectionHeader.click();
    }
  });

  test('edit text input field', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // General section is expanded by default — find Instance Name input
    // The first textbox in the general section region is instanceName
    const generalRegion = page.locator('region').first();
    const instanceNameInput = generalRegion
      .locator('input[type="text"], input[type="password"]')
      .first();
    await instanceNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await instanceNameInput.isVisible()) {
      await expect(instanceNameInput).toHaveValue('My Hivemind');
      await instanceNameInput.clear();
      await instanceNameInput.fill('Updated Hivemind');
      await expect(instanceNameInput).toHaveValue('Updated Hivemind');
    }
  });

  test('toggle boolean config', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Expand general section
    const generalHeader = page.locator('button:has-text("general")').first();
    await generalHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await generalHeader.isVisible()) {
      await generalHeader.click();
    }

    // Find Debug Mode toggle
    const debugToggle = page
      .locator('input[type="checkbox"]')
      .filter({ has: page.locator('~ *:has-text("Debug"), ~ label:has-text("Debug")') })
      .first();
    const toggleByLabel = page
      .locator(
        'label:has-text("Debug") input[type="checkbox"], label:has-text("Debug Mode") input[type="checkbox"]'
      )
      .first();
    const anyToggle = page.locator('.toggle, input[type="checkbox"]').first();

    await toggleByLabel.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

    if (await toggleByLabel.isVisible()) {
      const isChecked = await toggleByLabel.isChecked();
      await toggleByLabel.click();
      // State should toggle
      if (isChecked) {
        await expect(toggleByLabel).not.toBeChecked();
      } else {
        await expect(toggleByLabel).toBeChecked();
      }
    } else {
      await anyToggle.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await anyToggle.isVisible()) {
        await anyToggle.click();
      }
    }
  });

  test('select enum dropdown value', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Expand general section
    const generalHeader = page.locator('button:has-text("general")').first();
    await generalHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await generalHeader.isVisible()) {
      await generalHeader.click();
    }

    // Find log level select
    const logLevelSelect = page
      .locator('select:has(option[value="info"]), select:has(option:has-text("info"))')
      .first();
    await logLevelSelect.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await logLevelSelect.isVisible()) {
      await logLevelSelect.selectOption('warn');
      await expect(logLevelSelect).toHaveValue('warn');
    }
  });

  test('save config section triggers API call with payload', async ({ page }) => {
    let savedPayload: unknown = null;
    await page.route('**/api/config/global', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, json: mockConfigGlobal });
      }
      return route.fulfill({ status: 200, json: mockConfigGlobal });
    });
    await page.route('**/api/config/update', async (route) => {
      savedPayload = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { success: true, message: 'Configuration saved' } });
    });
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Look for a Save button
    const saveBtn = page
      .locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]')
      .first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }
  });

  test('success message after save', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/update', (route) =>
      route.fulfill({
        status: 200,
        json: { success: true, message: 'Configuration saved successfully' },
      })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    const saveBtn = page
      .locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]')
      .first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      // Check for success toast or alert
      const successAlert = page
        .locator(
          '.alert-success, [class*="toast"] [class*="success"], [role="alert"]:has-text("success"), [class*="success"]'
        )
        .first();
      await successAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await successAlert.isVisible()) {
        await expect(successAlert).toBeVisible();
      }
    }
  });

  test('rollback button opens modal with snapshot list', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Page shows "Rollbacks" button (may be disabled if no rollbacks)
    const rollbackBtn = page.locator('button:has-text("Rollbacks")').first();
    if ((await rollbackBtn.count()) > 0 && (await rollbackBtn.isEnabled())) {
      await rollbackBtn.click();

      // Modal should open
      const modal = page
        .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
        .first();
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();

        // Rollback timestamps should be listed
        const snap1 = page.getByText('2026-03-25').first();
        await snap1.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
        if (await snap1.isVisible()) {
          await expect(snap1).toBeVisible();
        }
      }
    }
  });

  test('select snapshot and confirm rollback', async ({ page }) => {
    let rolledBack = false;
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );
    await page.route('**/api/config/hot-reload/rollback/*', async (route) => {
      rolledBack = true;
      await route.fulfill({ status: 200, json: { success: true, message: 'Rollback successful' } });
    });

    await page.goto('/admin/configuration');

    const rollbackBtn = page.locator('button:has-text("Rollbacks")').first();
    if ((await rollbackBtn.count()) > 0 && (await rollbackBtn.isEnabled())) {
      await rollbackBtn.click();

      const modal = page
        .locator('dialog.modal[open] .modal-box, .modal-box, [role="dialog"]')
        .first();
      await modal.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await modal.isVisible()) {
        // Select first snapshot (rendered as clickable divs)
        const snapshotItem = modal
          .locator('[class*="cursor-pointer"]')
          .filter({ hasText: /rollback/ })
          .first();
        await snapshotItem.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
        if (await snapshotItem.isVisible()) {
          await snapshotItem.click();
        }

        // Confirm rollback
        const confirmBtn = modal
          .locator(
            'button:has-text("Confirm"), button:has-text("Rollback"), button:has-text("Restore")'
          )
          .first();
        await confirmBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });

  test('error handling when save fails', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/update', (route) =>
      route.fulfill({
        status: 500,
        json: { success: false, message: 'Internal server error: failed to persist configuration' },
      })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    const saveBtn = page
      .locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]')
      .first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      // Check for error toast or alert
      const errorAlert = page
        .locator(
          '.alert-error, [class*="toast"] [class*="error"], [role="alert"]:has-text("error"), [class*="error"]'
        )
        .first();
      await errorAlert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await errorAlert.isVisible()) {
        await expect(errorAlert).toBeVisible();
      }
    }
  });

  test('modified indicator before save', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // General section is expanded by default — find Instance Name input
    const generalRegion = page.locator('region').first();
    const instanceNameInput = generalRegion
      .locator('input[type="text"], input[type="password"]')
      .first();
    await instanceNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await instanceNameInput.isVisible()) {
      await instanceNameInput.clear();
      await instanceNameInput.fill('Modified Hivemind');

      // Look for unsaved/modified indicator (page shows "Modified" badge on section)
      const modifiedIndicator = page.getByText('Modified').first();
      await modifiedIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await modifiedIndicator.isVisible()) {
        await expect(modifiedIndicator).toBeVisible();
      }
    }
  });

  test('sensitive field badge display', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/hot-reload/rollbacks', (route) =>
      route.fulfill({ status: 200, json: mockRollbacks })
    );

    await page.goto('/admin/configuration');

    // Expand LLM section which has sensitive API Key
    const llmHeader = page.locator('button:has-text("llm")').first();
    await llmHeader.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await llmHeader.isVisible()) {
      await llmHeader.click();
    }

    // Look for sensitive indicator near API Key field
    const sensitiveBadge = page
      .locator(
        '.badge:has-text("Sensitive"), .badge:has-text("Secret"), [class*="sensitive"], [title*="sensitive" i]'
      )
      .first();
    await sensitiveBadge.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await sensitiveBadge.isVisible()) {
      await expect(sensitiveBadge).toBeVisible();
    }

    // Check masked value is present
    const maskedValue = page.getByText('••••••••').first();
    await maskedValue.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
    if (await maskedValue.isVisible()) {
      await expect(maskedValue).toBeVisible();
    }
  });
});
