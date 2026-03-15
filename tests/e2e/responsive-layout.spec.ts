import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const PAGES = [
  { path: '/admin/mcp-servers', name: 'MCPServersPage' },
  { path: '/admin/mcp-tools', name: 'MCPToolsPage' },
  { path: '/admin/specs', name: 'SpecsPage' },
  { path: '/admin/export', name: 'ExportPage' },
  { path: '/admin/bots', name: 'BotsPage' },
  { path: '/admin/personas', name: 'PersonasPage' },
];

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.route('/api/auth/check', (route) =>
      route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } })
    );
    await page.route('/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    // Stub all list endpoints to return empty arrays
    await page.route('/api/specs', (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, json: { data: [], success: true } });
      } else {
        route.continue();
      }
    });
  });

  for (const viewport of VIEWPORTS) {
    for (const pg of PAGES) {
      test(`${pg.name} renders without overflow at ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pg.path);
        await page.waitForLoadState('domcontentloaded');

        // Assert no horizontal scrollbar (content fits viewport)
        const hasHorizontalScroll = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll, `Horizontal overflow at ${viewport.name} on ${pg.path}`).toBe(false);

        await page.screenshot({
          path: `test-results/responsive-${pg.name}-${viewport.name}.png`,
          fullPage: false,
        });
      });
    }
  }
});
