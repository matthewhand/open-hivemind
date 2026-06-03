import { expect, Page, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth } from './test-utils';

/**
 * Density Toggle E2E Tests
 *
 * Verifies that the UI density Settings actually drive the live CSS
 * `--density-scale` custom property on <html>. This is the kind of test
 * that catches the "dead settings" bug where toggles update state but
 * don't reflow the UI.
 *
 * The mapping (see src/client/src/index.css):
 *   data-density="comfortable"  -> --density-scale: 1
 *   data-density="compact"      -> --density-scale: 0.7
 *   data-density="spacious"     -> --density-scale: 1.25
 *   + data-compact-density=true -> calc(scale * 0.85)
 */

const SETTINGS_PATH = '/admin/settings';

/**
 * Read the live --density-scale on <html> as the browser computes it.
 * Note: CSS may render `0.7` as `.7` — caller should be tolerant.
 */
async function readDensityScale(page: Page): Promise<string> {
  return await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--density-scale').trim()
  );
}

/**
 * Parse the scale string into a number (handles both "0.7" and ".7").
 */
function scaleNum(s: string): number {
  return parseFloat(s);
}

/**
 * Locate the UI Density <select> on the Settings page. We search by the
 * known option label text so we don't depend on a particular DOM hierarchy.
 */
async function findDensitySelect(page: Page) {
  const select = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: /Compact \(Maximum info\)/ }) })
    .first();
  await expect(select).toBeVisible({ timeout: 10000 });
  return select;
}

test.describe('UI Density Toggle - live CSS reflow', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Always start from a clean slate so reload-persistence tests aren't
    // contaminated by previous test state.
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('density');
        localStorage.removeItem('compactDensity');
      } catch (_) {
        /* noop */
      }
    });
  });

  test('default density on first load is 1', async ({ page }) => {
    await navigateAndWaitReady(page, '/');
    const scale = await readDensityScale(page);
    // Tolerate "1" or "1.0" — both equal 1
    expect(scaleNum(scale)).toBeCloseTo(1, 5);
  });

  test('selecting Compact updates --density-scale to 0.7', async ({ page }) => {
    await navigateAndWaitReady(page, SETTINGS_PATH);

    const select = await findDensitySelect(page);
    await select.selectOption('compact');

    // Allow a tick for the store subscription to flush the data attribute.
    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(0.7, 5);
  });

  test('selecting Spacious updates --density-scale to 1.25', async ({ page }) => {
    await navigateAndWaitReady(page, SETTINGS_PATH);

    const select = await findDensitySelect(page);
    await select.selectOption('spacious');

    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(1.25, 5);
  });

  test('compactDensity ON x density=comfortable resolves to 0.85', async ({ page }) => {
    await navigateAndWaitReady(page, SETTINGS_PATH);

    // Ensure density is "comfortable" (= 1) so the multiplier yields exactly 0.85
    const select = await findDensitySelect(page);
    await select.selectOption('comfortable');

    // Toggle compactDensity via the store (no Settings UI exists for it yet).
    // Fall back to setting the attribute directly if the store isn't on window.
    await page.evaluate(() => {
      // The uiStore exposes setCompactDensity; we mirror its behavior here
      // since it's not attached to window. Setting the attribute is what
      // actually drives the CSS, so this is a faithful reproduction.
      document.documentElement.setAttribute('data-compact-density', 'true');
    });

    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(0.85, 5);
  });

  test('density persists across reload', async ({ page }) => {
    await navigateAndWaitReady(page, SETTINGS_PATH);

    const select = await findDensitySelect(page);
    await select.selectOption('spacious');

    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(1.25, 5);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(1.25, 5);
  });

  test('card padding shrinks when density goes compact', async ({ page }) => {
    // Start from comfortable
    await navigateAndWaitReady(page, SETTINGS_PATH);
    let select = await findDensitySelect(page);
    await select.selectOption('comfortable');

    // Navigate to a page that renders cards
    await navigateAndWaitReady(page, '/admin/bots');

    // Find any .card-body and capture computed padding
    const cardBody = page.locator('.card-body').first();
    await expect(cardBody).toBeVisible({ timeout: 10000 });

    const beforePadding = await cardBody.evaluate(
      (el) => getComputedStyle(el as HTMLElement).paddingTop
    );
    const beforePx = parseFloat(beforePadding);
    expect(beforePx).toBeGreaterThan(0);

    // Switch density to compact
    await navigateAndWaitReady(page, SETTINGS_PATH);
    select = await findDensitySelect(page);
    await select.selectOption('compact');

    await expect
      .poll(async () => scaleNum(await readDensityScale(page)), { timeout: 5000 })
      .toBeCloseTo(0.7, 5);

    // Re-visit bots and re-measure
    await navigateAndWaitReady(page, '/admin/bots');
    const cardBodyAfter = page.locator('.card-body').first();
    await expect(cardBodyAfter).toBeVisible({ timeout: 10000 });

    const afterPadding = await cardBodyAfter.evaluate(
      (el) => getComputedStyle(el as HTMLElement).paddingTop
    );
    const afterPx = parseFloat(afterPadding);

    // Don't hardcode pixels; just assert it shrunk.
    expect(afterPx).toBeLessThan(beforePx);
  });
});
