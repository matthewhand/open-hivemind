import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, waitForPageReady } from './test-utils';

/**
 * Smoke Test - Providers, Integrations & Documentation Pages
 *
 * Tests that provider and integration pages load successfully.
 * @tag @smoke @providers
 */

interface PageTest {
  path: string;
  label: string;
}

const PROVIDER_PAGES: PageTest[] = [
  { path: '/admin/providers', label: 'Providers Overview' },
  { path: '/admin/providers/message', label: 'Message Providers' },
  { path: '/admin/providers/llm', label: 'LLM Providers' },
  { path: '/admin/providers/memory', label: 'Memory Providers' },
  { path: '/admin/providers/tool', label: 'Tool Providers' },
  { path: '/admin/integrations/llm', label: 'Integrations LLM' },
  { path: '/admin/integrations/message', label: 'Integrations Message' },
  { path: '/admin/marketplace', label: 'Marketplace' },
  { path: '/admin/webhooks', label: 'Webhooks' },
  { path: '/admin/specs', label: 'Specs' },
  { path: '/admin/api-docs', label: 'API Docs' },
  { path: '/admin/sitemap', label: 'Sitemap' },
  { path: '/admin/static', label: 'Static Pages' },
  { path: '/admin/showcase', label: 'DaisyUI Showcase' },
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

  await page.route('**/sitemap.json*', (route) => {
    return route.fulfill({
      status: 200,
      json: {
        generated: new Date().toISOString(),
        baseUrl: 'http://localhost:4050',
        totalUrls: 2,
        urls: [],
      },
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

test.describe('Smoke Test - Providers & Documentation Pages', () => {
  test('providers overview page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[0]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Providers overview failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('message providers page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[1]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Message providers failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('LLM providers page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[2]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `LLM providers failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('memory providers page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[3]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Memory providers failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('tool providers page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[4]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Tool providers failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('LLM integrations page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[5]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `LLM integrations failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('message integrations page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[6]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Message integrations failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('marketplace page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[7]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Marketplace failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('webhooks page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[8]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Webhooks failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('specs page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[9]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Specs failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('API docs page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[10]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `API docs failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('sitemap page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[11]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Sitemap failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('static pages page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[12]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `Static pages failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });

  test('DaisyUI showcase page loads', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const results = await validatePageLoads(page, [PROVIDER_PAGES[13]], errors);
    const failures = results.filter((r) => r.status === 'fail');

    expect(failures.length, `DaisyUI showcase failed: ${failures[0]?.error}`).toBe(0);
    expect(errors.length).toBe(0);
  });
});
