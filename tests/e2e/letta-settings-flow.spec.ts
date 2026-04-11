/**
 * Letta Provider Settings Flow
 *
 * Tests the end-to-end workflow for configuring a Letta LLM provider:
 *
 *  1. Open "Add LLM Provider" modal and select Letta.
 *  2. Switch deployment to ☁️ Letta Cloud — apiUrl auto-updates.
 *  3. Enter an API key (password field).
 *  4. Do NOT click "Test Connection" — avoids spamming the Letta Cloud service.
 *  5. Switch deployment to 🏠 Self-Hosted (localhost).
 *  6. apiUrl auto-updates to http://localhost:8283.
 *  7. ProviderConfigForm fires an automatic health-check fetch against the URL.
 *  8. Assert the ✓ badge (badge-success) appears next to the URL field,
 *     confirming the health check returned OK.
 *
 * Mocking strategy
 * ─────────────────
 * • Letta Cloud health endpoint is mocked to 503 so CI never pings api.letta.com.
 * • Localhost health endpoint is mocked to 200 OK, simulating a local container.
 * • /api/admin/available-provider-types returns Letta so it appears in the
 *   Provider Type dropdown (it is not in the hardcoded LLM_PROVIDER_CONFIGS list).
 */
import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady, registerViteSourceBypass } from './test-utils';

const FAKE_AGENT_ID = 'agent-e2fa86a3-cea2-4645-acd7-d12f0dc2efd5';

test.describe('Letta Provider Settings Flow', () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // ── Core auth / infra stubs ────────────────────────────────────────────
    await page.route('**/api/auth/verify', (r) =>
      r.fulfill({
        json: {
          success: true,
          data: { valid: true, user: { id: 'admin', username: 'admin', role: 'owner', permissions: ['*'] } },
        },
      })
    );
    await page.route('**/api/auth/trusted-status', (r) => r.fulfill({ json: { trusted: true } }));
    await page.route('**/api/csrf-token', (r) => r.fulfill({ json: { token: 'mock-csrf' } }));
    await page.route('**/api/health**', (r) =>
      r.fulfill({ json: { status: 'healthy', version: '1.0.0', uptime: 86400 } })
    );
    await page.route('**/api/onboarding/status', (r) =>
      r.fulfill({ json: { success: true, data: { completed: true, step: 5 } } })
    );
    await page.route('**/api/demo/status', (r) =>
      r.fulfill({ json: { active: false, isDemoMode: false } })
    );
    await page.route('**/api/personas**', (r) => r.fulfill({ json: [] }));
    await page.route('**/api/bots**', (r) =>
      r.fulfill({ json: { success: true, data: { bots: [] } } })
    );
    await page.route('**/api/dashboard/**', (r) =>
      r.fulfill({ json: { success: true, data: { bots: [], uptime: 100 } } })
    );

    // ── LLM provider stubs ─────────────────────────────────────────────────
    await page.route('**/api/config/llm-profiles', (r) =>
      r.fulfill({ json: { llm: [], profiles: { llm: [] } } })
    );
    await page.route('**/api/config/llm-status', (r) =>
      r.fulfill({
        json: {
          configured: false,
          providers: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
          libraryStatus: {},
        },
      })
    );
    await page.route('**/api/config/global', (r) =>
      r.fulfill({ json: { _userSettings: { values: {} }, llm: { values: {} } } })
    );
    await page.route('**/api/config**', (r) => r.fulfill({ json: { bots: [] } }));
    // Generic admin catch-all must be registered BEFORE the specific route
    // because Playwright uses last-registered-wins matching order.
    await page.route('**/api/admin/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
    // Specific: expose Letta in the Provider Type dropdown (registered after → wins)
    await page.route('**/api/admin/available-provider-types', (r) =>
      r.fulfill({
        json: {
          success: true,
          data: {
            llm: [
              {
                key: 'letta',
                label: 'Letta',
                type: 'llm',
                fields: { required: [], optional: [], advanced: [] },
              },
            ],
            messenger: [],
            memory: [],
          },
        },
      })
    );

    // Letta agent lookup (backend proxy — never hits Letta Cloud directly)
    await page.route('**/api/letta/agents', (r) =>
      r.fulfill({
        json: [
          { id: FAKE_AGENT_ID, name: 'test-companion', description: 'Playwright test agent' },
        ],
      })
    );

    // ── Health-check intercepts ────────────────────────────────────────────
    // Cloud: simulate unreachable so CI never pings api.letta.com
    await page.route('https://api.letta.com/**', (r) => r.fulfill({ status: 503 }));
    // Localhost: simulate a healthy local container
    await page.route('http://localhost:8283/**', (r) =>
      r.fulfill({ status: 200, json: { status: 'ok' } })
    );

    // Must be last — lets Vite source-module requests pass through unchanged.
    await registerViteSourceBypass(page);
  });

  test('cloud config → localhost switch → health badge shows ✓', async ({ page }) => {
    // ── Navigate to LLM Providers ─────────────────────────────────────────
    await navigateAndWaitReady(page, '/admin/providers/llm');
    await expect(page.getByRole('heading', { name: /LLM Providers/i })).toBeVisible({
      timeout: 15_000,
    });

    // ── Open modal ────────────────────────────────────────────────────────
    // Two "Create Profile" buttons exist (toolbar + empty-state); click the toolbar one
    await page.getByRole('button', { name: /Create Profile/i }).first().click();
    // Modal is a native <dialog> element opened via showModal() — not role="dialog"
    const modal = page.locator('dialog.modal[open]');
    await expect(modal).toBeVisible({ timeout: 5_000 });
    await expect(modal).toContainText('Add LLM Provider');

    // ── Select Letta as provider type ─────────────────────────────────────
    // The Provider Type select is inside the first .form-control in the modal.
    // It is distinct from the per-field selects rendered by ProviderConfigForm.
    const providerTypeControl = modal
      .locator('.form-control')
      .filter({ hasText: /Provider Type/ })
      .first();
    await providerTypeControl.locator('select').selectOption('letta');

    // Wait for the Letta ProviderConfigForm to render (Deployment field appears)
    await expect(modal).toContainText('Deployment', { timeout: 5_000 });
    await expect(modal).toContainText('API URL');

    // ── Enter a profile name ──────────────────────────────────────────────
    await modal.locator('input[name="name"]').fill('My Letta Provider');

    // ── STEP 1: Switch to ☁️ Letta Cloud ─────────────────────────────────
    // The Deployment select is identifiable by the 'cloud' option value.
    const deploymentSelect = modal.locator('select').filter({
      has: page.locator('option[value="cloud"]'),
    });
    await deploymentSelect.selectOption('cloud');

    // linkedDefaults auto-updates apiUrl
    const apiUrlInput = modal.locator('input[type="url"]');
    await expect(apiUrlInput).toHaveValue('https://api.letta.com/v1', { timeout: 3_000 });

    // ── STEP 2: Enter API key — cloud credential ──────────────────────────
    // We use a clearly fake key; the password field just needs to be non-empty.
    // We deliberately do NOT click "Test Connection" to avoid pinging Letta Cloud.
    const apiKeyInput = modal.locator(
      'input[aria-label="API Key / Server Password password input"]'
    );
    await apiKeyInput.fill('sk-let-playwright-fake-key-do-not-submit');
    await expect(apiKeyInput).not.toHaveValue('');

    // Enter an agent ID so all required fields are satisfied
    const agentIdInput = modal.locator('input[aria-label="Agent ID text input"]');
    await agentIdInput.fill(FAKE_AGENT_ID);

    // Screenshot: cloud configuration state (no test click)
    await page.screenshot({
      path: 'docs/screenshots/letta-cloud-config.png',
      fullPage: true,
    });

    // ── STEP 3: Switch to 🏠 Self-Hosted (localhost) ──────────────────────
    await deploymentSelect.selectOption('local');

    // apiUrl must auto-update via linkedDefaults
    await expect(apiUrlInput).toHaveValue('http://localhost:8283', { timeout: 3_000 });

    // ── STEP 4: Confirm health badge shows ✓ ─────────────────────────────
    //
    // ProviderConfigForm fires:
    //   fetch('http://localhost:8283/v1/health/', { signal: AbortSignal.timeout(3000) })
    // automatically whenever apiUrl changes (no user action required).
    //
    // Badge lifecycle:
    //   absent  →  '…' (badge-ghost, loading)  →  '✓' (badge-success, healthy)
    //
    // We mocked localhost:8283 to return 200, so the badge should settle on ✓.
    const healthBadge = modal.locator('.badge-success').filter({ hasText: '✓' });
    await expect(healthBadge).toBeVisible({ timeout: 8_000 });

    // Screenshot: localhost with confirmed healthy badge
    await page.screenshot({
      path: 'docs/screenshots/letta-localhost-health.png',
      fullPage: true,
    });

    // Final sanity: the modal still shows the correct URL and the badge is green
    await expect(apiUrlInput).toHaveValue('http://localhost:8283');
    await expect(healthBadge).toHaveClass(/badge-success/);
  });
});
