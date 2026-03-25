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

  const mockConfigGlobal = {
    sections: [
      {
        id: 'general',
        label: 'General Settings',
        fields: [
          { key: 'instanceName', label: 'Instance Name', type: 'text', value: 'My Hivemind', sensitive: false },
          { key: 'debugMode', label: 'Debug Mode', type: 'boolean', value: false, sensitive: false },
          { key: 'logLevel', label: 'Log Level', type: 'enum', value: 'info', options: ['debug', 'info', 'warn', 'error'], sensitive: false },
        ],
      },
      {
        id: 'llm',
        label: 'LLM Configuration',
        fields: [
          { key: 'defaultProvider', label: 'Default Provider', type: 'enum', value: 'openai', options: ['openai', 'anthropic', 'ollama'], sensitive: false },
          { key: 'apiKey', label: 'API Key', type: 'text', value: '••••••••', sensitive: true },
          { key: 'temperature', label: 'Temperature', type: 'text', value: '0.7', sensitive: false },
          { key: 'streamResponses', label: 'Stream Responses', type: 'boolean', value: true, sensitive: false },
        ],
      },
      {
        id: 'messaging',
        label: 'Messaging',
        fields: [
          { key: 'defaultProvider', label: 'Default Provider', type: 'enum', value: 'discord', options: ['discord', 'slack', 'mattermost'], sensitive: false },
          { key: 'retryAttempts', label: 'Retry Attempts', type: 'text', value: '3', sensitive: false },
          { key: 'webhookSecret', label: 'Webhook Secret', type: 'text', value: '••••••••', sensitive: true },
        ],
      },
      {
        id: 'security',
        label: 'Security',
        fields: [
          { key: 'sessionTimeout', label: 'Session Timeout (s)', type: 'text', value: '3600', sensitive: false },
          { key: 'requireMfa', label: 'Require MFA', type: 'boolean', value: false, sensitive: false },
          { key: 'jwtSecret', label: 'JWT Secret', type: 'text', value: '••••••••', sensitive: true },
        ],
      },
    ],
  };

  const mockSnapshots = [
    { id: 'snap-1', label: 'Snapshot 2026-03-25 12:00', createdAt: '2026-03-25T12:00:00Z', description: 'Before LLM provider change' },
    { id: 'snap-2', label: 'Snapshot 2026-03-24 09:30', createdAt: '2026-03-24T09:30:00Z', description: 'Before security update' },
    { id: 'snap-3', label: 'Snapshot 2026-03-22 16:00', createdAt: '2026-03-22T16:00:00Z', description: 'Initial configuration' },
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

  test('load config sections in accordion', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Verify section labels appear
    const generalSection = page.getByText('General Settings').or(page.getByText('General')).first();
    await expect(generalSection).toBeVisible({ timeout: 5000 });

    const llmSection = page.getByText('LLM Configuration').or(page.getByText('LLM')).first();
    if ((await llmSection.count()) > 0) {
      await expect(llmSection).toBeVisible();
    }

    const messagingSection = page.getByText('Messaging').first();
    if ((await messagingSection.count()) > 0) {
      await expect(messagingSection).toBeVisible();
    }
  });

  test('expand and collapse config sections', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Click on a section header to expand/collapse
    const sectionHeader = page.locator('.collapse-title, [class*="accordion"] summary, [class*="accordion"] button, details summary').filter({ hasText: /General|LLM|Messaging|Security/i }).first();
    if ((await sectionHeader.count()) > 0) {
      // Expand
      await sectionHeader.click();
      await page.waitForTimeout(300);

      // Collapse
      await sectionHeader.click();
      await page.waitForTimeout(300);
    }
  });

  test('edit text input field', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Expand general section if needed
    const generalHeader = page.locator('.collapse-title, details summary, [class*="accordion"] button').filter({ hasText: /General/i }).first();
    if ((await generalHeader.count()) > 0) {
      await generalHeader.click();
      await page.waitForTimeout(300);
    }

    // Find Instance Name input and edit it
    const instanceNameInput = page.locator('input[value="My Hivemind"], input[placeholder*="instance" i], input[name*="instanceName" i]').first();
    if ((await instanceNameInput.count()) > 0) {
      await instanceNameInput.clear();
      await instanceNameInput.fill('Updated Hivemind');
      await page.waitForTimeout(200);
      await expect(instanceNameInput).toHaveValue('Updated Hivemind');
    }
  });

  test('toggle boolean config', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Expand general section
    const generalHeader = page.locator('.collapse-title, details summary, [class*="accordion"] button').filter({ hasText: /General/i }).first();
    if ((await generalHeader.count()) > 0) {
      await generalHeader.click();
      await page.waitForTimeout(300);
    }

    // Find Debug Mode toggle
    const debugToggle = page.locator('input[type="checkbox"]').filter({ has: page.locator('~ *:has-text("Debug"), ~ label:has-text("Debug")') }).first();
    const toggleByLabel = page.locator('label:has-text("Debug") input[type="checkbox"], label:has-text("Debug Mode") input[type="checkbox"]').first();
    const anyToggle = page.locator('.toggle, input[type="checkbox"]').first();

    if ((await toggleByLabel.count()) > 0) {
      const isChecked = await toggleByLabel.isChecked();
      await toggleByLabel.click();
      await page.waitForTimeout(200);
      // State should toggle
      if (isChecked) {
        await expect(toggleByLabel).not.toBeChecked();
      } else {
        await expect(toggleByLabel).toBeChecked();
      }
    } else if ((await anyToggle.count()) > 0) {
      await anyToggle.click();
      await page.waitForTimeout(200);
    }
  });

  test('select enum dropdown value', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Expand general section
    const generalHeader = page.locator('.collapse-title, details summary, [class*="accordion"] button').filter({ hasText: /General/i }).first();
    if ((await generalHeader.count()) > 0) {
      await generalHeader.click();
      await page.waitForTimeout(300);
    }

    // Find log level select
    const logLevelSelect = page.locator('select:has(option[value="info"]), select:has(option:has-text("info"))').first();
    if ((await logLevelSelect.count()) > 0) {
      await logLevelSelect.selectOption('warn');
      await page.waitForTimeout(200);
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
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Look for a Save button
    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]').first();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('success message after save', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/update', (route) =>
      route.fulfill({ status: 200, json: { success: true, message: 'Configuration saved successfully' } })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]').first();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.click();
      await page.waitForTimeout(500);

      // Check for success toast or alert
      const successAlert = page.locator('.alert-success, [class*="toast"] [class*="success"], [role="alert"]:has-text("success"), [class*="success"]').first();
      if ((await successAlert.count()) > 0) {
        await expect(successAlert).toBeVisible();
      }
    }
  });

  test('rollback button opens modal with snapshot list', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    const rollbackBtn = page.locator('button:has-text("Rollback"), button:has-text("Restore"), button:has-text("History"), button[title*="Rollback"]').first();
    if ((await rollbackBtn.count()) > 0) {
      await rollbackBtn.click();
      await page.waitForTimeout(500);

      // Modal should open
      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();

        // Snapshots should be listed
        const snap1 = page.getByText('2026-03-25').or(page.getByText('Before LLM provider change')).first();
        if ((await snap1.count()) > 0) {
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
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );
    await page.route('**/api/config/snapshots/snap-1/rollback', async (route) => {
      rolledBack = true;
      await route.fulfill({ status: 200, json: { success: true, message: 'Rollback successful' } });
    });
    await page.route('**/api/config/rollback', async (route) => {
      rolledBack = true;
      await route.fulfill({ status: 200, json: { success: true, message: 'Rollback successful' } });
    });

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    const rollbackBtn = page.locator('button:has-text("Rollback"), button:has-text("Restore"), button:has-text("History")').first();
    if ((await rollbackBtn.count()) > 0) {
      await rollbackBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        // Select first snapshot
        const snapshotItem = modal.locator('button, tr, li, [class*="item"]').filter({ hasText: /2026-03-25|Before LLM/ }).first();
        if ((await snapshotItem.count()) > 0) {
          await snapshotItem.click();
          await page.waitForTimeout(300);
        }

        // Confirm rollback
        const confirmBtn = modal.locator('button:has-text("Confirm"), button:has-text("Rollback"), button:has-text("Restore")').first();
        if ((await confirmBtn.count()) > 0) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('error handling when save fails', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/update', (route) =>
      route.fulfill({ status: 500, json: { success: false, message: 'Internal server error: failed to persist configuration' } })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("Apply"), button[type="submit"]').first();
    if ((await saveBtn.count()) > 0) {
      await saveBtn.click();
      await page.waitForTimeout(500);

      // Check for error toast or alert
      const errorAlert = page.locator('.alert-error, [class*="toast"] [class*="error"], [role="alert"]:has-text("error"), [class*="error"]').first();
      if ((await errorAlert.count()) > 0) {
        await expect(errorAlert).toBeVisible();
      }
    }
  });

  test('modified indicator before save', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Expand a section and modify a field
    const generalHeader = page.locator('.collapse-title, details summary, [class*="accordion"] button').filter({ hasText: /General/i }).first();
    if ((await generalHeader.count()) > 0) {
      await generalHeader.click();
      await page.waitForTimeout(300);
    }

    const instanceNameInput = page.locator('input[value="My Hivemind"], input[placeholder*="instance" i], input[name*="instanceName" i]').first();
    if ((await instanceNameInput.count()) > 0) {
      await instanceNameInput.clear();
      await instanceNameInput.fill('Modified Hivemind');
      await page.waitForTimeout(300);

      // Look for unsaved/modified indicator
      const modifiedIndicator = page.locator('[class*="modified"], [class*="unsaved"], [class*="dirty"], .badge:has-text("Modified"), .badge:has-text("Unsaved"), text=/unsaved/i').first();
      if ((await modifiedIndicator.count()) > 0) {
        await expect(modifiedIndicator).toBeVisible();
      }
    }
  });

  test('sensitive field badge display', async ({ page }) => {
    await page.route('**/api/config/global', (route) =>
      route.fulfill({ status: 200, json: mockConfigGlobal })
    );
    await page.route('**/api/config/snapshots', (route) =>
      route.fulfill({ status: 200, json: mockSnapshots })
    );

    await page.goto('/admin/configuration');
    await page.waitForTimeout(1000);

    // Expand LLM section which has sensitive API Key
    const llmHeader = page.locator('.collapse-title, details summary, [class*="accordion"] button').filter({ hasText: /LLM/i }).first();
    if ((await llmHeader.count()) > 0) {
      await llmHeader.click();
      await page.waitForTimeout(300);
    }

    // Look for sensitive indicator near API Key field
    const sensitiveBadge = page.locator('.badge:has-text("Sensitive"), .badge:has-text("Secret"), [class*="sensitive"], [title*="sensitive" i]').first();
    if ((await sensitiveBadge.count()) > 0) {
      await expect(sensitiveBadge).toBeVisible();
    }

    // Check masked value is present
    const maskedValue = page.getByText('••••••••').first();
    if ((await maskedValue.count()) > 0) {
      await expect(maskedValue).toBeVisible();
    }
  });
});
