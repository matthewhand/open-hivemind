/**
 * Widget System Screenshot & Behaviour Tests
 *
 * Documents the dashboard widget layout — captures screenshots for docs
 * and asserts that widgets do NOT overlap each other when added sequentially.
 *
 * Regression coverage
 * -------------------
 * "adding multiple widgets sequentially" explicitly guards against a
 * stale-localStorage race condition that existed before the lazy-useState fix:
 *   - The old code used `useEffect(..., [initialWidgets])` to hydrate widget state
 *     from localStorage on mount.
 *   - OverviewPage's async API calls triggered parent re-renders that passed a
 *     new `[]` array reference as the `initialWidgets` prop each time.
 *   - Because `[]` !== `[]` in JavaScript, the effect re-fired on every re-render
 *     and overwrote the in-memory widget list with the stale localStorage snapshot
 *     (which didn't yet contain the widget the user had just added).
 *   - The symptom: a widget appeared briefly then vanished, or later-added widgets
 *     caused the first widget to disappear.
 *   - The fix: lazy `useState(() => {...})` initializer that reads localStorage
 *     exactly once on mount, so parent re-renders can never overwrite the live list.
 */
import { expect, test } from '@playwright/test';

const FAKE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';

const FAKE_USER = {
  id: 'admin',
  username: 'admin',
  email: 'admin@open-hivemind.com',
  role: 'owner',
  permissions: ['*'],
};

/** Inject auth token and mock all common API endpoints. */
async function setupAuth(page: import('@playwright/test').Page) {
  // Inject fake JWT so the React app thinks we're logged in
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem(
        'auth_tokens',
        JSON.stringify({ accessToken: token, refreshToken: token, expiresIn: 9999999 })
      );
      localStorage.setItem('auth_user', user);
      // Force widget layout on
      localStorage.setItem('hivemind-dashboard-layout', 'widget');
      // Clear any previously saved widgets so tests start fresh
      localStorage.removeItem('hivemind-dashboard-widgets');
    },
    { token: FAKE_TOKEN, user: JSON.stringify(FAKE_USER) }
  );

  // Auth endpoints
  await page.route('**/api/auth/verify', (r) =>
    r.fulfill({ json: { success: true, data: { valid: true, user: FAKE_USER } } })
  );
  await page.route('**/api/auth/trusted-status', (r) => r.fulfill({ json: { trusted: true } }));
  await page.route('**/api/csrf-token', (r) => r.fulfill({ json: { token: 'mock-csrf' } }));

  // Core API stubs
  await page.route('**/api/health**', (r) =>
    r.fulfill({ json: { status: 'healthy', version: '1.0.0', uptime: 86400 } })
  );
  await page.route('**/api/config**', (r) => r.fulfill({ json: { bots: [] } }));
  await page.route('**/api/bots**', (r) =>
    r.fulfill({ json: { success: true, data: { bots: [] } } })
  );
  await page.route('**/api/personas**', (r) => r.fulfill({ json: [] }));
  await page.route('**/api/dashboard/**', (r) =>
    r.fulfill({ json: { success: true, data: { bots: [], uptime: 100 } } })
  );
  await page.route('**/api/onboarding/status', (r) =>
    r.fulfill({ json: { success: true, data: { completed: true, step: 5 } } })
  );
  await page.route('**/api/admin/**', (r) => r.fulfill({ json: { success: true, data: [] } }));
  await page.route('**/api/demo/status', (r) =>
    r.fulfill({ json: { active: false, isDemoMode: false } })
  );
}

/**
 * Enter widget mode and edit mode, asserting both controls are visible.
 * Extracted to avoid repetition across tests.
 */
async function enterEditMode(page: import('@playwright/test').Page) {
  await page.goto('/admin/overview');
  await page.waitForLoadState('networkidle');

  const toggle = page.locator('[aria-label="Toggle widget dashboard layout"]');
  await expect(toggle).toBeVisible({ timeout: 15000 });
  if (!(await toggle.isChecked())) {
    await toggle.click();
    await page.waitForTimeout(400);
  }

  await page.locator('button', { hasText: /✏️ Edit/i }).click();
  await expect(page.locator('button', { hasText: /Add Widget/i })).toBeVisible({ timeout: 5000 });
}

/**
 * Add a widget via the palette, waiting for it to appear in the DOM.
 * Uses data-testid selectors for reliability.
 */
async function addWidgetViaTypeId(
  page: import('@playwright/test').Page,
  typeId: string,
  beforeCount: number
) {
  const widgetDivs = page.locator('[data-testid="dashboard-widget"]');

  // Open the palette
  await page.locator('button', { hasText: /Add Widget/i }).click();

  // Wait for the specific palette button to be visible
  const paletteBtn = page.locator(`[data-testid="palette-widget-${typeId}"]`);
  await expect(paletteBtn).toBeVisible({ timeout: 5000 });

  // Click the widget type button
  await paletteBtn.click();

  // Wait for the new widget to appear in the DOM
  await expect(widgetDivs).toHaveCount(beforeCount + 1, { timeout: 5000 });
}

test.describe('Dashboard Widget System', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  test('widget empty state — no widgets added', async ({ page }) => {
    await page.goto('/admin/overview');
    await page.waitForLoadState('networkidle');

    // The toggle should now be visible
    const toggle = page.locator('[aria-label="Toggle widget dashboard layout"]');
    await expect(toggle).toBeVisible({ timeout: 15000 });

    // Make sure widget mode is on
    const isChecked = await toggle.isChecked();
    if (!isChecked) {
      await toggle.click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: 'docs/screenshots/widget-empty-state.png',
      fullPage: true,
    });

    // Empty state message should show
    await expect(page.locator('text=No Widgets Added')).toBeVisible({ timeout: 5000 });
  });

  test('widget edit mode — Edit and Add Widget buttons', async ({ page }) => {
    await enterEditMode(page);

    await expect(page.locator('button', { hasText: /Add Widget/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /Reset Layout/i })).toBeVisible();

    await page.screenshot({
      path: 'docs/screenshots/widget-edit-mode.png',
      fullPage: true,
    });
  });

  test('widget palette — all 5 widget types visible', async ({ page }) => {
    await enterEditMode(page);

    await page.locator('button', { hasText: /Add Widget/i }).click();

    // Wait for palette to appear
    await expect(page.locator('[data-testid="widget-palette"]')).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: 'docs/screenshots/widget-palette.png',
      fullPage: true,
    });

    for (const typeId of ['stats', 'chart', 'activity', 'actions', 'health']) {
      await expect(page.locator(`[data-testid="palette-widget-${typeId}"]`)).toBeVisible();
    }
  });

  /**
   * REGRESSION TEST — stale-localStorage overwrite bug
   *
   * Previously, widgets added via the palette would silently disappear:
   *   - A `useEffect(..., [initialWidgets])` rehydrated widget state from
   *     localStorage whenever the parent re-rendered with a new `[]` prop reference.
   *   - Because async API calls in OverviewPage triggered re-renders with new `[]`
   *     array references, the effect fired AFTER a widget was added but BEFORE
   *     localStorage was updated, wiping the newly-added widget.
   *
   * The fix: lazy `useState(() => readLocalStorage())` that runs exactly once on
   * mount, making it immune to parent re-renders.
   *
   * This test verifies:
   *   1. Each widget added one-by-one is immediately visible (count increments).
   *   2. The count NEVER reverts — i.e., adding widget N+1 doesn't remove widget N.
   *   3. All widgets end up at distinct pixel positions (no stacking/overlap).
   */
  test('adding multiple widgets sequentially — count never reverts, positions never overlap', async ({
    page,
  }) => {
    await enterEditMode(page);

    const widgetDivs = page.locator('[data-testid="dashboard-widget"]');

    // ── Add widget 1 ──────────────────────────────────────────────────────────
    await addWidgetViaTypeId(page, 'stats', 0);
    // Allow parent re-renders to settle — if the bug were present the count
    // would drop back to 0 here as stale localStorage overwrites the live list.
    await page.waitForTimeout(400);
    await expect(widgetDivs).toHaveCount(1, { timeout: 3000 });

    // ── Add widget 2 ──────────────────────────────────────────────────────────
    await addWidgetViaTypeId(page, 'chart', 1);
    await page.waitForTimeout(400);
    // Count must still be 2 — not 1 (first widget survived) and not 0.
    await expect(widgetDivs).toHaveCount(2, { timeout: 3000 });

    // ── Add widget 3 ──────────────────────────────────────────────────────────
    await addWidgetViaTypeId(page, 'activity', 2);
    await page.waitForTimeout(400);
    await expect(widgetDivs).toHaveCount(3, { timeout: 3000 });

    await page.screenshot({
      path: 'docs/screenshots/widget-three-added.png',
      fullPage: true,
    });

    // ── Position uniqueness ───────────────────────────────────────────────────
    const count = await widgetDivs.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const boxes = await Promise.all(
      Array.from({ length: count }, (_, i) => widgetDivs.nth(i).boundingBox())
    );
    const valid = boxes.filter(Boolean) as { x: number; y: number }[];
    const uniquePositions = new Set(valid.map((b) => `${Math.round(b.x)},${Math.round(b.y)}`));

    console.log(`Widget positions: ${[...uniquePositions].join(' | ')}`);
    console.log(`Unique: ${uniquePositions.size} / Total: ${count}`);

    expect(uniquePositions.size).toBe(count);
  });

  test('Reset Layout distributes widgets in a grid', async ({ page }) => {
    await enterEditMode(page);

    const widgetDivs = page.locator('[data-testid="dashboard-widget"]');

    // Add all 5 widget types, waiting for each to appear in the DOM
    await addWidgetViaTypeId(page, 'stats', 0);
    await addWidgetViaTypeId(page, 'chart', 1);
    await addWidgetViaTypeId(page, 'activity', 2);
    await addWidgetViaTypeId(page, 'actions', 3);
    await addWidgetViaTypeId(page, 'health', 4);

    // Reset Layout should arrange them in a grid (no more pile-up)
    await page.locator('button', { hasText: /Reset Layout/i }).click();
    await page.waitForTimeout(300);

    await page.screenshot({
      path: 'docs/screenshots/widget-after-reset.png',
      fullPage: true,
    });

    const count = await widgetDivs.count();
    const boxes = await Promise.all(
      Array.from({ length: count }, (_, i) => widgetDivs.nth(i).boundingBox())
    );
    const valid = boxes.filter(Boolean) as { x: number; y: number }[];
    const uniquePositions = new Set(valid.map((b) => `${Math.round(b.x)},${Math.round(b.y)}`));

    // After Reset Layout, widgets should be at different positions
    expect(uniquePositions.size).toBe(count);
  });

  /**
   * UI/UX: widget removal via the in-widget ⋮ menu.
   *
   * Verifies that a user can remove a specific widget while leaving others
   * intact — an important affordance in any drag-and-drop dashboard.
   *
   * Flow:
   *   1. Add two widgets (stats + chart).
   *   2. Open the ⋮ options menu on the FIRST widget.
   *   3. Click "Remove".
   *   4. Assert the count drops to 1 (the second widget remains).
   *   5. Assert the removed widget's type is no longer in the DOM.
   */
  test('widget removal — ⋮ Remove deletes one widget while leaving others intact', async ({
    page,
  }) => {
    await enterEditMode(page);

    const widgetDivs = page.locator('[data-testid="dashboard-widget"]');

    // Add two distinct widget types
    await addWidgetViaTypeId(page, 'stats', 0);
    await addWidgetViaTypeId(page, 'chart', 1);
    await expect(widgetDivs).toHaveCount(2);

    // Open the ⋮ options menu on the first widget
    const firstWidget = widgetDivs.nth(0);
    await firstWidget.locator('[aria-label="Widget options"]').click();

    // Click Remove (styled with text-error class)
    await firstWidget.locator('a', { hasText: /Remove/i }).click();

    // The removed widget is gone — exactly one remains
    await expect(widgetDivs).toHaveCount(1, { timeout: 5000 });

    // The surviving widget should be the chart (second one added)
    await expect(widgetDivs.nth(0)).toHaveAttribute('data-widget-type', 'chart');

    // Empty-state text must NOT appear — one widget still exists
    await expect(page.locator('text=No Widgets Added')).not.toBeVisible();

    await page.screenshot({
      path: 'docs/screenshots/widget-after-removal.png',
      fullPage: true,
    });
  });

  test('full widget dashboard — final documentation screenshot', async ({ page }) => {
    await enterEditMode(page);

    await addWidgetViaTypeId(page, 'stats', 0);
    await addWidgetViaTypeId(page, 'chart', 1);
    await addWidgetViaTypeId(page, 'activity', 2);
    await addWidgetViaTypeId(page, 'actions', 3);
    await addWidgetViaTypeId(page, 'health', 4);

    await page.locator('button', { hasText: /Reset Layout/i }).click();
    await page.waitForTimeout(300);

    // Exit edit mode
    await page.locator('button', { hasText: /✓ Done/i }).click();
    await page.waitForTimeout(200);

    await page.screenshot({
      path: 'docs/screenshots/widget-dashboard.png',
      fullPage: true,
    });
  });
});
