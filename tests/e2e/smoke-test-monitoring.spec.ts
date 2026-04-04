import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, waitForPageReady } from './test-utils';

/**
 * Smoke Test - Monitoring & System Pages
 *
 * Tests that monitoring and system management pages load successfully.
 * @tag @smoke @system
 */

interface PageTest {
  path: string;
  label: string;
}

const MONITORING_PAGES: PageTest[] = [
  { path: '/admin/monitoring', label: 'Monitoring' },
  { path: '/admin/activity', label: 'Activity' },
  { path: '/admin/monitoring-dashboard', label: 'Monitoring Dashboard' },
  { path: '/admin/analytics', label: 'Analytics' },
  { path: '/admin/system-management', label: 'System Management' },
  { path: '/admin/export', label: 'Export' },
  { path: '/admin/settings', label: 'Settings' },
  { path: '/admin/configuration', label: 'Bot Configuration' },
  { path: '/admin/config', label: 'Config' },
  { path: '/admin/health', label: 'Health' },
  { path: '/admin/audit', label: 'Audit' },
];

async function mockAllApiEndpoints(page: import('@playwright/test').Page) {
  await page.route('**/api/**', (route) => {
    return route.fulfill({
      status: 200,
      json: { success: true, data: [] },
    });
  });

  await page.route('**/health/**', (route) => {
    return route.fulfill({
      status: 200,
      json: { status: 'healthy', version: '1.0.0', uptime: 86400 },
    });
  });
}

async function validatePageLoads(
  page: import('@playwright/test').Page,
  pages: PageTest[],
  errors: string[]
) {
  const results: Array<{ label: string; status: 'pass' | 'fail'; error?: string }> = [];

  for (const { path, label } of pages) {
    try {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      const status = response?.status() || 0;
      if (status !== 200 && status !== 304) {
        throw new Error(`HTTP ${status}`);
      }

      await waitForPageReady(page, 3000);

      const currentUrl = page.url();
      if (!currentUrl.includes(path)) {
        throw new Error(`Unexpected redirect to ${currentUrl}`);
      }

      const body = page.locator('body');
      const bodyText = await body.innerText().catch(() => '');

      if (
        bodyText.includes('Something went wrong') ||
        bodyText.includes('Unexpected Application Error')
      ) {
        throw new Error('React error boundary detected');
      }

      const isEmpty = await body.evaluate((el) => {
        const text = el.textContent || '';
        return text.trim().length === 0;
      });

      if (isEmpty) {
        throw new Error('Page body is empty');
      }

      results.push({ label, status: 'pass' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ label, status: 'fail', error: errorMsg });
    }
  }

  return results;
}

test.describe('Smoke Test - Monitoring & System Pages', () => {
  test('monitoring page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[0]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Monitoring failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('activity page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[1]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Activity failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('monitoring dashboard page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[2]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Monitoring dashboard failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('analytics page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[3]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Analytics failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('system management page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[4]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `System management failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('export page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[5]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Export failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('settings page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[6]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Settings failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('bot configuration page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[7]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Bot configuration failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('config page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[8]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Config failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('health page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[9]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Health failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('audit page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [MONITORING_PAGES[10]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Audit failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });
});
