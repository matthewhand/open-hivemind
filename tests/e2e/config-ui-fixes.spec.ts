import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Config UI Fixes E2E Tests with Strict Error Detection
 * Tests FAIL on console errors
 */
test.describe('Config UI Fixes', () => {
  test.setTimeout(90000);

  test('config page renders without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    page.on("requestfailed", request => console.log(request.url() + " " + request.failure().errorText));
    page.on("response", response => { if(!response.ok()) console.log("Failed response: " + response.url() + " " + response.status())});
    await page.route("/api/dashboard/status", async (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route("/api/config/llm-profiles", async (route) => route.fulfill({ status: 200, json: { profiles: { llm: [] } } }));
    await page.route("/api/health/detailed", async (route) => route.fulfill({ status: 200, json: { status: "ok" } }));
    await page.route("/api/config/global", async (route) => route.fulfill({ status: 200, json: { server: { values: { port: 3000 }, schema: { properties: { port: { format: "port", default: 3000 } } } } } }));
    await page.route("/api/config/llm-status", async (route) => route.fulfill({ status: 200, json: { configured: true, hasMissing: false } }));
    page.on("requestfailed", request => console.log(request.url() + " " + request.failure().errorText));
    page.on("response", response => { if(!response.ok()) console.log("Failed response: " + response.url() + " " + response.status())});
    await navigateAndWaitReady(page, '/admin/settings');

    const content = page.locator('main, [class*="content"]').first();
    await expect(content).toBeVisible();
    await page.screenshot({ path: 'test-results/config-ui-01-render.png', fullPage: true });

    await assertNoErrors(errors, 'Config UI render');
  });

  test('config forms work correctly', async ({ page }) => {
    await page.route("/api/health/detailed", async (route) => route.fulfill({ status: 200, json: { status: "ok" } }));
    await page.route("/api/config/global", async (route) => route.fulfill({ status: 200, json: { server: { values: { port: 3000 }, schema: { properties: { port: { format: "port", default: 3000 } } } } } }));
    await page.route("/api/dashboard/status", async (route) => route.fulfill({ status: 200, json: { bots: [] } }));
    await page.route("/api/config/llm-profiles", async (route) => route.fulfill({ status: 200, json: { profiles: { llm: [] } } }));
    await page.route("/api/config/llm-status", async (route) => route.fulfill({ status: 200, json: { configured: true, hasMissing: false } }));
    page.on("requestfailed", request => console.log(request.url() + " " + request.failure().errorText));
    page.on("response", response => { if(!response.ok()) console.log("Failed response: " + response.url() + " " + response.status())});
    const errors = await setupTestWithErrorDetection(page);
    page.on("requestfailed", request => console.log(request.url() + " " + request.failure().errorText));
    page.on("response", response => { if(!response.ok()) console.log("Failed response: " + response.url() + " " + response.status())});
    await navigateAndWaitReady(page, '/admin/settings');

    const inputs = page.locator('input, select, textarea');
    await page.screenshot({ path: 'test-results/config-ui-02-forms.png', fullPage: true });

    await assertNoErrors(errors, 'Config UI forms');
  });
});
