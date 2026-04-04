import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, waitForPageReady } from './test-utils';

/**
 * Smoke Test - Personas, MCP, and Guards Pages
 *
 * Tests that configuration pages load successfully.
 * @tag @smoke @config
 */

interface PageTest {
  path: string;
  label: string;
}

const CONFIG_PAGES: PageTest[] = [
  { path: '/admin/personas', label: 'Personas' },
  { path: '/admin/mcp/servers', label: 'MCP Servers' },
  { path: '/admin/mcp/tools', label: 'MCP Tools' },
  { path: '/admin/guards', label: 'Guards' },
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

test.describe('Smoke Test - Config Pages', () => {
  test('personas page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [CONFIG_PAGES[0]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Personas failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('MCP servers page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [CONFIG_PAGES[1]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `MCP servers failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('MCP tools page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [CONFIG_PAGES[2]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `MCP tools failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('guards page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [CONFIG_PAGES[3]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Guards failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });
});
