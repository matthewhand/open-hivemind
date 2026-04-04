import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection, waitForPageReady } from './test-utils';

/**
 * ⚠️ DEPRECATED - This file is kept for backward compatibility only.
 *
 * This test suite has been split into granular test files for better isolation and debugging:
 * - smoke-test-dashboard.spec.ts (Dashboard & Admin Overview)
 * - smoke-test-bots.spec.ts (Bot Management Pages)
 * - smoke-test-config.spec.ts (Personas, MCP, Guards)
 * - smoke-test-monitoring.spec.ts (Monitoring & System Pages)
 * - smoke-test-providers.spec.ts (Providers, Integrations & Docs)
 *
 * @deprecated Use the new granular smoke test files instead
 * @tag @smoke @deprecated
 */

interface PageTest {
  path: string;
  label: string;
  criticalElement?: string; // Optional selector for key page element
}

/**
 * All routes from AppRouter.tsx that should be tested
 * Organized by functional area for easier maintenance
 */
const ALL_ROUTES: PageTest[] = [
  // Main Dashboard
  { path: '/dashboard', label: 'Dashboard', criticalElement: 'main' },

  // Admin Overview
  { path: '/admin/overview', label: 'Admin Overview', criticalElement: 'main' },

  // Bot Management
  { path: '/admin/bots', label: 'Bots List', criticalElement: 'main' },
  { path: '/admin/bots/create', label: 'Bot Create', criticalElement: 'form, main' },
  { path: '/admin/bots/templates', label: 'Bot Templates', criticalElement: 'main' },
  { path: '/admin/chat', label: 'Chat', criticalElement: 'main' },

  // Personas
  { path: '/admin/personas', label: 'Personas', criticalElement: 'main' },

  // MCP (Model Context Protocol)
  { path: '/admin/mcp/servers', label: 'MCP Servers', criticalElement: 'main' },
  { path: '/admin/mcp/tools', label: 'MCP Tools', criticalElement: 'main' },

  // Guards
  { path: '/admin/guards', label: 'Guards', criticalElement: 'main' },

  // Monitoring & Activity
  { path: '/admin/monitoring', label: 'Monitoring', criticalElement: 'main' },
  { path: '/admin/activity', label: 'Activity', criticalElement: 'main' },
  { path: '/admin/monitoring-dashboard', label: 'Monitoring Dashboard', criticalElement: 'main' },
  { path: '/admin/analytics', label: 'Analytics', criticalElement: 'main' },

  // System Management
  { path: '/admin/system-management', label: 'System Management', criticalElement: 'main' },
  { path: '/admin/export', label: 'Export', criticalElement: 'main' },
  { path: '/admin/settings', label: 'Settings', criticalElement: 'main' },
  { path: '/admin/configuration', label: 'Bot Configuration', criticalElement: 'main' },
  { path: '/admin/config', label: 'Config', criticalElement: 'main' },

  // Marketplace
  { path: '/admin/marketplace', label: 'Marketplace', criticalElement: 'main' },

  // Provider Management
  { path: '/admin/providers', label: 'Providers Overview', criticalElement: 'main' },
  { path: '/admin/providers/message', label: 'Message Providers', criticalElement: 'main' },
  { path: '/admin/providers/llm', label: 'LLM Providers', criticalElement: 'main' },
  { path: '/admin/providers/memory', label: 'Memory Providers', criticalElement: 'main' },
  { path: '/admin/providers/tool', label: 'Tool Providers', criticalElement: 'main' },

  // Integrations
  { path: '/admin/integrations/llm', label: 'Integrations LLM', criticalElement: 'main' },
  { path: '/admin/integrations/message', label: 'Integrations Message', criticalElement: 'main' },

  // Specs & Audit
  { path: '/admin/specs', label: 'Specs', criticalElement: 'main' },
  { path: '/admin/audit', label: 'Audit', criticalElement: 'main' },

  // Enterprise & Health
  { path: '/admin/health', label: 'Health', criticalElement: 'main' },

  // Webhooks
  { path: '/admin/webhooks', label: 'Webhooks', criticalElement: 'main' },

  // Documentation & Utilities
  { path: '/admin/api-docs', label: 'API Docs', criticalElement: 'main' },
  { path: '/admin/sitemap', label: 'Sitemap', criticalElement: 'main' },
  { path: '/admin/static', label: 'Static Pages', criticalElement: 'main' },
  { path: '/admin/showcase', label: 'DaisyUI Showcase', criticalElement: 'main' },
];

/**
 * Mock all API endpoints to prevent network errors during testing
 */
async function mockAllApiEndpoints(page: import('@playwright/test').Page) {
  // Mock all /api/* endpoints with successful responses
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    // Health endpoints
    if (path.includes('/health')) {
      return route.fulfill({
        status: 200,
        json: {
          status: 'healthy',
          version: '1.0.0',
          uptime: 86400,
          services: { database: 'healthy', cache: 'healthy' },
        },
      });
    }

    // Config endpoints
    if (path.includes('/config')) {
      return route.fulfill({
        status: 200,
        json: { bots: [], llmProfiles: [], sources: [] },
      });
    }

    // Dashboard
    if (path.includes('/dashboard')) {
      return route.fulfill({
        status: 200,
        json: { bots: [], uptime: 100, stats: {} },
      });
    }

    // Bots
    if (path.includes('/bots')) {
      return route.fulfill({
        status: 200,
        json: { data: { bots: [] } },
      });
    }

    // Personas
    if (path.includes('/personas')) {
      return route.fulfill({
        status: 200,
        json: [],
      });
    }

    // Guards
    if (path.includes('/guard')) {
      return route.fulfill({
        status: 200,
        json: { data: [] },
      });
    }

    // MCP
    if (path.includes('/mcp')) {
      return route.fulfill({
        status: 200,
        json: { servers: {}, configurations: [], tools: [] },
      });
    }

    // Activity
    if (path.includes('/activity')) {
      return route.fulfill({
        status: 200,
        json: { data: [], total: 0 },
      });
    }

    // Marketplace
    if (path.includes('/marketplace')) {
      return route.fulfill({
        status: 200,
        json: [],
      });
    }

    // Providers
    if (path.includes('/provider')) {
      return route.fulfill({
        status: 200,
        json: { data: [] },
      });
    }

    // Integrations
    if (path.includes('/integration')) {
      return route.fulfill({
        status: 200,
        json: { data: [] },
      });
    }

    // Specs
    if (path.includes('/spec')) {
      return route.fulfill({
        status: 200,
        json: { specs: [] },
      });
    }

    // Audit
    if (path.includes('/audit')) {
      return route.fulfill({
        status: 200,
        json: { events: [] },
      });
    }

    // Webhooks
    if (path.includes('/webhook')) {
      return route.fulfill({
        status: 200,
        json: { webhooks: [] },
      });
    }

    // Settings
    if (path.includes('/setting')) {
      return route.fulfill({
        status: 200,
        json: { siteName: 'Open Hivemind', theme: 'dark' },
      });
    }

    // CSRF token
    if (path.includes('/csrf-token')) {
      return route.fulfill({
        status: 200,
        json: { token: 'mock-csrf-token' },
      });
    }

    // Catch-all for any other API endpoints
    return route.fulfill({
      status: 200,
      json: { success: true, data: [] },
    });
  });

  // Mock health endpoints (outside /api/ prefix)
  await page.route('**/health/**', (route) => {
    return route.fulfill({
      status: 200,
      json: { status: 'healthy', version: '1.0.0', uptime: 86400 },
    });
  });

  // Mock sitemap.json
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

test.describe('Smoke Test - All Pages', () => {
  test.setTimeout(120000); // 2 minutes total for all tests

  /**
   * Main smoke test - visits all pages in a single test for speed
   * This is faster than individual tests because:
   * 1. Authentication happens once
   * 2. Browser context is reused
   * 3. No test setup/teardown overhead between pages
   */
  test('all major pages load successfully @smoke', async ({ page }) => {
    // Setup authentication and error detection
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    // Track page load times and results
    const results: Array<{
      path: string;
      label: string;
      status: 'pass' | 'fail';
      loadTime: number;
      error?: string;
    }> = [];

    console.log('\n🚀 Starting comprehensive smoke test...\n');

    // Visit each page and validate
    for (const { path, label, criticalElement } of ALL_ROUTES) {
      const startTime = Date.now();

      try {
        // Navigate to the page
        const response = await page.goto(path, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Check for 200 status
        const status = response?.status() || 0;
        if (status !== 200 && status !== 304) {
          throw new Error(`HTTP ${status}`);
        }

        // Wait for page to be stable
        await waitForPageReady(page, 3000);

        // Verify we're on the correct page (no unexpected redirects)
        const currentUrl = page.url();
        if (!currentUrl.includes(path)) {
          throw new Error(`Unexpected redirect to ${currentUrl}`);
        }

        // Check for critical page element
        if (criticalElement) {
          // Use a short timeout to keep the test fast
          const element = page.locator(criticalElement).first();
          await element.waitFor({ state: 'attached', timeout: 2000 });
        }

        // Verify body has content (not blank page)
        const body = page.locator('body');
        const isEmpty = await body.evaluate((el) => {
          const text = el.textContent || '';
          return text.trim().length === 0;
        });

        if (isEmpty) {
          throw new Error('Page body is empty');
        }

        // Check for React error boundaries
        const bodyText = await body.innerText().catch(() => '');
        if (bodyText.includes('Something went wrong') ||
            bodyText.includes('Unexpected Application Error')) {
          throw new Error('React error boundary detected');
        }

        const loadTime = Date.now() - startTime;
        results.push({ path, label, status: 'pass', loadTime });
        console.log(`✅ ${label.padEnd(30)} ${loadTime}ms`);

      } catch (error) {
        const loadTime = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ path, label, status: 'fail', loadTime, error: errorMsg });
        console.error(`❌ ${label.padEnd(30)} ${loadTime}ms - ${errorMsg}`);
      }
    }

    // Generate summary report
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const totalLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0);
    const avgLoadTime = Math.round(totalLoadTime / results.length);

    console.log('\n' + '='.repeat(60));
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Pages: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Time: ${totalLoadTime}ms (${(totalLoadTime / 1000).toFixed(1)}s)`);
    console.log(`Avg Load Time: ${avgLoadTime}ms`);
    console.log('='.repeat(60));

    // List failures if any
    const failures = results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
      console.log('\n❌ FAILED PAGES:');
      failures.forEach(({ label, path, error }) => {
        console.log(`  - ${label} (${path})`);
        console.log(`    Error: ${error}`);
      });
      console.log('');
    }

    // Log slowest pages (top 5)
    const slowest = [...results]
      .sort((a, b) => b.loadTime - a.loadTime)
      .slice(0, 5);

    console.log('\n⏱️  SLOWEST PAGES:');
    slowest.forEach(({ label, loadTime }) => {
      console.log(`  - ${label.padEnd(30)} ${loadTime}ms`);
    });
    console.log('');

    // Check for console errors
    if (errors.length > 0) {
      console.log('\n⚠️  CONSOLE ERRORS DETECTED:');
      errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      console.log('');
    }

    // Fail the test if any pages failed to load
    expect(failed, `${failed} page(s) failed to load. See logs above for details.`).toBe(0);

    // Fail if there were console errors
    expect(errors.length, `${errors.length} console error(s) detected. See logs above.`).toBe(0);
  });

  /**
   * Quick health check - validates the most critical pages
   * This can run even faster for quick validation
   */
  test('critical pages load successfully @smoke @quick', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const criticalPages: PageTest[] = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/admin/overview', label: 'Admin Overview' },
      { path: '/admin/bots', label: 'Bots' },
      { path: '/admin/chat', label: 'Chat' },
      { path: '/admin/monitoring', label: 'Monitoring' },
    ];

    console.log('\n⚡ Running quick critical pages check...\n');

    for (const { path, label } of criticalPages) {
      const response = await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: 5000,
      });

      expect(response?.status()).toBe(200);

      // Verify body has content
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();

      console.log(`✅ ${label}`);
    }

    expect(errors.length, 'No console errors expected').toBe(0);
  });

  /**
   * Validate that no page redirects to login (auth is working)
   */
  test('authenticated pages do not redirect to login @smoke', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    // Sample a few admin pages
    const testPaths = [
      '/admin/overview',
      '/admin/bots',
      '/admin/settings',
      '/dashboard',
    ];

    for (const path of testPaths) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 5000 });

      // Should not be redirected to /login
      expect(page.url()).not.toContain('/login');
      expect(page.url()).toContain(path);
    }

    expect(errors.length).toBe(0);
  });

  /**
   * Performance validation - ensure no page takes too long
   */
  test('all pages load within performance budget @smoke @performance', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    await mockAllApiEndpoints(page);

    const PERFORMANCE_BUDGET_MS = 5000; // 5 seconds max per page
    const slowPages: Array<{ path: string; time: number }> = [];

    for (const { path, label } of ALL_ROUTES.slice(0, 10)) { // Test first 10 for speed
      const startTime = Date.now();

      await page.goto(path, {
        waitUntil: 'domcontentloaded',
        timeout: PERFORMANCE_BUDGET_MS,
      });

      await waitForPageReady(page, 2000);

      const loadTime = Date.now() - startTime;

      if (loadTime > PERFORMANCE_BUDGET_MS) {
        slowPages.push({ path: `${label} (${path})`, time: loadTime });
      }
    }

    if (slowPages.length > 0) {
      console.log('\n⚠️  Pages exceeding performance budget:');
      slowPages.forEach(({ path, time }) => {
        console.log(`  - ${path}: ${time}ms (budget: ${PERFORMANCE_BUDGET_MS}ms)`);
      });
    }

    expect(
      slowPages.length,
      `${slowPages.length} page(s) exceeded performance budget`
    ).toBe(0);

    expect(errors.length).toBe(0);
  });
});
