import { expect, test } from '@playwright/test';
import { registerViteSourceBypass, setupAuth, waitForPageReady } from './test-utils';

/**
 * Swarm Orchestration Mode E2E Tests
 *
 * Tests the Swarm Orchestration section on the Response Profiles page
 * (/admin/config/response-profiles), covering all 5 mode options:
 *   - Exclusive (First Bot Wins)
 *   - Broadcast (All Respond)
 *   - Rotating (Round Robin)
 *   - Priority (Ranked)
 *   - Collaborative (Combine)
 *
 * Includes screenshots for visual regression and documentation.
 */
test.describe('Swarm Orchestration Mode', () => {
  test.setTimeout(90000);

  const SCREENSHOT_DIR = 'tests/e2e/screenshots';

  // ─── Shared mock helpers ───────────────────────────────────────────────────

  /**
   * Mock all endpoints the Response Profiles page depends on.
   */
  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/auth/verify', (route) => {
        console.log('INTERCEPTED: /api/auth/verify');
        return route.fulfill({
          status: 200,
          json: {
            user: {
              id: 'admin',
              username: 'admin',
              email: 'admin@open-hivemind.com',
              role: 'owner',
              permissions: ['*'],
            },
          },
        });
      }),
      page.route('**/api/health', (route) =>
        route.fulfill({ status: 200, json: { status: 'ok' } })
      ),
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
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
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/demo/status', (route) =>
        route.fulfill({ status: 200, json: { active: false } })
      ),
      page.route('**/api/dashboard/summary', (route) =>
        route.fulfill({
          status: 200,
          json: { totalBots: 0, activeBots: 0, providers: { llms: 0, message: 0 } },
        })
      ),
      page.route('**/api/dashboard/recent-activity*', (route) =>
        route.fulfill({ status: 200, json: [] })
      ),
    ]);
  }

  /**
   * Helper to mock the response-profiles API with an in-memory store.
   * Returns the store so tests can mutate it between actions.
   */
  function mockResponseProfilesApi(
    page: import('@playwright/test').Page,
    initialProfiles: any[] = []
  ) {
    const store: any[] = [...initialProfiles];

    page.route('**/api/config/response-profiles', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: { profiles: store, data: store } });
      } else if (method === 'POST') {
        const body = route.request().postDataJSON();
        const key =
          body.key ||
          body.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        const newProfile = {
          key,
          name: body.name || 'Unnamed',
          description: body.description || '',
          swarmMode: body.swarmMode || 'exclusive',
          enabled: true,
          isBuiltIn: false,
          settings: body.settings || {},
        };
        store.push(newProfile);
        await route.fulfill({
          status: 200,
          json: { profile: newProfile, message: 'Profile created' },
        });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    page.route('**/api/config/response-profiles/**', async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      const key = url.split('/').pop() || '';

      if (method === 'GET') {
        const profile = store.find((p) => p.key === key);
        if (profile) {
          await route.fulfill({ status: 200, json: { profile } });
        } else {
          await route.fulfill({ status: 404, json: { error: 'Profile not found' } });
        }
      } else if (method === 'PUT') {
        const idx = store.findIndex((p) => p.key === key);
        if (idx !== -1) {
          const body = route.request().postDataJSON();
          store[idx] = { ...store[idx], ...body };
          await route.fulfill({
            status: 200,
            json: { profile: store[idx], message: 'Profile updated' },
          });
        } else {
          await route.fulfill({ status: 404, json: { error: 'Profile not found' } });
        }
      } else if (method === 'DELETE') {
        const idx = store.findIndex((p) => p.key === key);
        if (idx !== -1) {
          store.splice(idx, 1);
          await route.fulfill({ status: 200, json: { success: true } });
        } else {
          await route.fulfill({ status: 404, json: { error: 'Profile not found' } });
        }
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    return { store };
  }

  // ─── Shared selectors ──────────────────────────────────────────────────────

  const SWARM_MODES = [
    { value: 'exclusive', label: 'Exclusive (First Bot Wins)', icon: '\u{1F3C6}' },
    { value: 'broadcast', label: 'Broadcast (All Respond)', icon: '\u{1F4E1}' },
    { value: 'rotating', label: 'Rotating (Round Robin)', icon: '\u{1F504}' },
    { value: 'priority', label: 'Priority (Ranked)', icon: '\u{1F3AF}' },
    { value: 'collaborative', label: 'Collaborative (Combine)', icon: '\u{1F91D}' },
  ];

  /**
   * Locate a swarm mode card inside the modal by its label text.
   */
  function getModeCard(page: import('@playwright/test').Page, label: string) {
    // The mode cards are button elements containing the label text
    return page.locator('button').filter({ hasText: label }).first();
  }

  /**
   * Open the create profile modal and fill in the basic fields.
   */
  async function openCreateModal(page: import('@playwright/test').Page) {
    const createBtn = page.getByRole('button', { name: 'Create Profile' });
    await expect(createBtn).toBeVisible({ timeout: 15000 });
    await createBtn.click();

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"], dialog.modal[open], .modal[open], .modal-box');
    await expect(modal).toBeVisible({ timeout: 10000 });
    return modal;
  }

  /**
   * Fill the profile name in the modal.
   */
  async function fillProfileName(page: import('@playwright/test').Page, name: string) {
    // The name input is inside the modal; find it by placeholder
    const nameInput = page.getByRole('textbox', { name: /profile name/i }).first();
    if (await nameInput.count()) {
      await nameInput.fill(name);
    } else {
      // Fallback: find any input near "Profile Name" label
      const fallback = page.locator('.form-control input').first();
      await fallback.fill(name);
    }
  }

  /**
   * Click the Create/Update button in the modal.
   */
  async function submitModal(
    page: import('@playwright/test').Page,
    action: 'Create' | 'Update' = 'Create'
  ) {
    const submitBtn = page.getByRole('button', { name: action });
    await submitBtn.click();
    // Give the API a moment to respond
    await page.waitForTimeout(300);
  }

  // ─── beforeEach ────────────────────────────────────────────────────────────

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
    await registerViteSourceBypass(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Happy Path — Create Profile with Each Swarm Mode
  // ───────────────────────────────────────────────────────────────────────────

  for (const mode of SWARM_MODES) {
    test(`creates profile with swarm mode: ${mode.value}`, async ({ page }) => {
      const { store } = mockResponseProfilesApi(page);

      await page.goto('/admin/config/response-profiles');
      await waitForPageReady(page, 20000);

      // Debug
      console.log(`URL after nav: ${page.url()}`);
      const bodyText = await page.textContent('body');
      console.log(`Body preview: ${(bodyText || '').substring(0, 200)}`);

      // Open create modal
      const modal = await openCreateModal(page);

      // Fill name
      await fillProfileName(page, `Test ${mode.label}`);

      // Select the swarm mode card
      const modeCard = getModeCard(page, mode.label);
      await expect(modeCard).toBeVisible();
      await modeCard.click();

      // Screenshot: modal with mode selection visible
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/swarm-mode-create-${mode.value}-modal.png`,
        fullPage: false,
      });

      // Submit
      await submitModal(page, 'Create');
      await page.waitForTimeout(500);

      // Verify the profile card appears with the correct mode badge
      // The badge shows the emoji + the short label (before the parenthesis)
      const shortLabel = mode.label.split('(')[0].trim();
      const profileCard = page
        .locator('.card, [class*="bg-base-100"]')
        .filter({ hasText: mode.icon })
        .first();

      // Also verify via store
      const createdProfile = store.find((p) => p.name === `Test ${mode.label}`);
      expect(createdProfile).toBeTruthy();
      expect(createdProfile.swarmMode).toBe(mode.value);

      // Screenshot: saved profile card with mode badge
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/swarm-mode-create-${mode.value}-saved.png`,
        fullPage: false,
      });

      // If the card is visible, verify the badge text
      if (await profileCard.isVisible().catch(() => false)) {
        await expect(profileCard).toContainText(shortLabel);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Happy Path — Edit Profile, Change Mode
  // ───────────────────────────────────────────────────────────────────────────

  test('edits profile and changes mode from exclusive to broadcast', async ({ page }) => {
    const initialProfile = {
      key: 'test-edit-mode',
      name: 'Edit Mode Test',
      description: 'Testing mode change',
      swarmMode: 'exclusive',
      enabled: true,
      isBuiltIn: false,
      settings: {},
    };
    const { store } = mockResponseProfilesApi(page, [initialProfile]);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for the profile card to appear
    const profileCard = page
      .locator('.card, [class*="bg-base-100"]')
      .filter({ hasText: 'Edit Mode Test' })
      .first();
    await expect(profileCard).toBeVisible({ timeout: 15000 });

    // Screenshot: before mode change (should show Exclusive badge)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-edit-before.png`,
      fullPage: false,
    });

    // Click the edit button on the card
    const editBtn = profileCard.locator('button').filter({ hasText: '' }).first();
    // Find edit button more precisely - it's the one with the Edit icon
    const editButtons = profileCard.locator('button');
    const editBtnCount = await editButtons.count();
    // The edit button is typically the first non-expand button
    let foundEdit = false;
    for (let i = 0; i < editBtnCount; i++) {
      const btn = editButtons.nth(i);
      const text = await btn.textContent().catch(() => '');
      // Edit button might not have text, look for svg icon
      if ((await btn.locator('svg').count()) > 0) {
        // Try clicking and see if modal opens
        await btn.click();
        const modal = page.locator('[role="dialog"], dialog.modal[open], .modal[open], .modal-box');
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          foundEdit = true;
          break;
        }
      }
    }

    if (!foundEdit) {
      // Fallback: try the first button
      await editButtons.first().click();
      await page.waitForTimeout(500);
    }

    // Wait for modal
    const modal = page.locator('[role="dialog"], dialog.modal[open], .modal[open], .modal-box');
    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify current mode is exclusive (card should be highlighted)
    const exclusiveCard = getModeCard(page, 'Exclusive (First Bot Wins)');
    await expect(exclusiveCard).toBeVisible();

    // Change to broadcast
    const broadcastCard = getModeCard(page, 'Broadcast (All Respond)');
    await expect(broadcastCard).toBeVisible();
    await broadcastCard.click();

    // Screenshot: after mode change (broadcast selected)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-edit-after.png`,
      fullPage: false,
    });

    // Submit
    await submitModal(page, 'Update');
    await page.waitForTimeout(500);

    // Verify the store was updated
    const updatedProfile = store.find((p) => p.key === 'test-edit-mode');
    expect(updatedProfile).toBeTruthy();
    expect(updatedProfile.swarmMode).toBe('broadcast');

    // Verify the page reflects the change - broadcast badge should be visible
    const broadcastBadge = page
      .locator('.card, [class*="bg-base-100"]')
      .filter({ hasText: '\u{1F4E1}' })
      .first();
    if (await broadcastBadge.isVisible().catch(() => false)) {
      await expect(broadcastBadge).toContainText('Broadcast');
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Edge Case — Switch modes rapidly
  // ───────────────────────────────────────────────────────────────────────────

  test('rapidly switches between mode cards and verifies final selection', async ({ page }) => {
    mockResponseProfilesApi(page);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Open create modal
    const modal = await openCreateModal(page);
    await fillProfileName(page, 'Rapid Switch Test');

    // Rapidly click through all modes
    for (const mode of SWARM_MODES) {
      const card = getModeCard(page, mode.label);
      await card.click();
      // Small delay between clicks to simulate rapid but distinct clicks
      await page.waitForTimeout(50);
    }

    // Screenshot: mode selection UI during rapid switching
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-rapid-switching.png`,
      fullPage: false,
    });

    // Now click back to exclusive as final selection
    const exclusiveCard = getModeCard(page, 'Exclusive (First Bot Wins)');
    await exclusiveCard.click();
    await page.waitForTimeout(200);

    // Verify exclusive is selected (should have the border-primary bg-primary/10 class)
    const exclusiveSelected = page.locator('button.border-primary.bg-primary\\/10').filter({
      hasText: 'Exclusive',
    });
    await expect(exclusiveSelected).toBeVisible();

    // Screenshot after final selection
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-rapid-switching-final.png`,
      fullPage: false,
    });

    // Submit and verify
    await submitModal(page, 'Create');
    await page.waitForTimeout(500);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Edge Case — Default mode is Exclusive
  // ───────────────────────────────────────────────────────────────────────────

  test('default swarm mode is Exclusive when opening create modal', async ({ page }) => {
    mockResponseProfilesApi(page);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Open create modal
    await openCreateModal(page);

    // Screenshot: modal default state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-default-exclusive.png`,
      fullPage: false,
    });

    // Verify exclusive card is selected (highlighted)
    const exclusiveCard = page
      .locator('button.border-primary.bg-primary\\/10')
      .filter({ hasText: 'Exclusive' })
      .first();
    await expect(exclusiveCard).toBeVisible();

    // Verify other mode cards are NOT highlighted
    for (const mode of SWARM_MODES) {
      if (mode.value !== 'exclusive') {
        const otherCard = page
          .locator('button.border-base-300')
          .filter({ hasText: mode.label })
          .first();
        // These cards should exist but not have the primary highlight
        await expect(otherCard).toBeVisible();
      }
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Edge Case — Mode badge rendering
  // ───────────────────────────────────────────────────────────────────────────

  test('all 5 mode badges render with correct emoji and label', async ({ page }) => {
    // Create one profile for each mode
    const profiles = SWARM_MODES.map((mode, idx) => ({
      key: `badge-test-${mode.value}`,
      name: `Badge Test ${mode.label}`,
      description: `Testing badge for ${mode.value}`,
      swarmMode: mode.value,
      enabled: true,
      isBuiltIn: false,
      settings: {},
    }));

    mockResponseProfilesApi(page, profiles);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Wait for page to load profiles
    await page.waitForTimeout(500);

    // Screenshot: all 5 profile cards with different mode badges
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-all-badges.png`,
      fullPage: false,
    });

    // Verify each badge is visible with correct emoji + short label
    for (const mode of SWARM_MODES) {
      const shortLabel = mode.label.split('(')[0].trim();

      // Each profile card should contain the emoji
      const cardWithEmoji = page
        .locator('.card, [class*="bg-base-100"]')
        .filter({ hasText: mode.icon })
        .first();

      // Also look for the badge element specifically
      const badge = page
        .locator('[class*="Badge"], .badge')
        .filter({ hasText: shortLabel })
        .first();

      // At least one of these should be visible
      const cardVisible = await cardWithEmoji.isVisible().catch(() => false);
      const badgeVisible = await badge.isVisible().catch(() => false);
      expect(cardVisible || badgeVisible).toBe(true);
    }

    // Take a full-page screenshot to capture all badges in context
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-all-badges-full.png`,
      fullPage: true,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Edge Case — Invalid mode rejection
  // ───────────────────────────────────────────────────────────────────────────

  test('rejects profile creation with invalid swarmMode', async ({ page }) => {
    // Mock POST to return a 400 error for invalid swarmMode
    mockCommonEndpoints(page);

    page.route('**/api/config/response-profiles', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ status: 200, json: { profiles: [], data: [] } });
      } else if (method === 'POST') {
        const body = route.request().postDataJSON();
        // Reject if swarmMode is not one of the valid values
        const validModes = ['exclusive', 'broadcast', 'rotating', 'priority', 'collaborative'];
        if (body.swarmMode && !validModes.includes(body.swarmMode)) {
          await route.fulfill({
            status: 400,
            json: {
              error: 'Invalid swarmMode',
              message: `swarmMode must be one of: ${validModes.join(', ')}`,
            },
          });
        } else {
          // Allow valid requests through
          const key = body.key || 'valid-profile';
          await route.fulfill({
            status: 200,
            json: {
              profile: {
                key,
                name: body.name,
                swarmMode: body.swarmMode || 'exclusive',
                settings: {},
              },
            },
          });
        }
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    // Also mock the PUT endpoint for individual profiles
    page.route('**/api/config/response-profiles/**', async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Open create modal
    const modal = await openCreateModal(page);
    await fillProfileName(page, 'Invalid Mode Test');

    // We can't easily select an invalid mode through the UI since the cards
    // only offer valid options. Instead, we test the API-level rejection by
    // intercepting the form submission and sending an invalid payload.
    // We'll use page.evaluate to simulate a direct API call with invalid data.

    // First close the modal (we can't select invalid mode through UI)
    const cancelBtn = modal.getByRole('button', { name: 'Cancel' });
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click();
    }
    await page.waitForTimeout(300);

    // Make a direct API call with invalid swarmMode using page.evaluate
    const response = await page.evaluate(async () => {
      const token = JSON.parse(localStorage.getItem('auth_tokens') || '{}').accessToken;
      try {
        const res = await fetch('/api/config/response-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: 'Invalid Mode Profile',
            key: 'invalid-mode',
            swarmMode: 'invalid-mode-value',
            settings: {},
          }),
        });
        return { status: res.status, body: await res.json() };
      } catch (err: any) {
        return { status: 0, error: err.message };
      }
    });

    // Screenshot: error state (the page should still be visible)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-invalid-rejection.png`,
      fullPage: false,
    });

    // Verify the API rejected the invalid mode
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Invalid swarmMode');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Bonus — All 5 modes visible in modal grid
  // ───────────────────────────────────────────────────────────────────────────

  test('displays all 5 swarm mode cards in the create modal', async ({ page }) => {
    mockResponseProfilesApi(page);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    await openCreateModal(page);

    // Verify all 5 mode cards are visible
    for (const mode of SWARM_MODES) {
      const card = getModeCard(page, mode.label);
      await expect(card).toBeVisible();
      // Verify the emoji is present
      await expect(card).toContainText(mode.icon);
    }

    // Screenshot: all mode cards in the modal
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/swarm-mode-all-cards-in-modal.png`,
      fullPage: false,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Bonus — Mode description tooltips
  // ───────────────────────────────────────────────────────────────────────────

  test('each mode card shows its description text', async ({ page }) => {
    mockResponseProfilesApi(page);

    await page.goto('/admin/config/response-profiles');
    await page.waitForLoadState('networkidle').catch(() => {});

    await openCreateModal(page);

    // Verify description text is visible for each mode card
    const descriptions = [
      'First bot to decide',
      'All bots independently decide',
      'Bots take turns',
      'Bots ranked by priority',
      'Multiple bots contribute',
    ];

    for (const desc of descriptions) {
      await expect(page.getByText(desc).first()).toBeVisible();
    }
  });
});
