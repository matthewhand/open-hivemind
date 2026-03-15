import { expect, test } from '@playwright/test';
import {
  assertNoErrors,
  navigateAndWaitReady,
  setupTestWithErrorDetection,
  waitForPageReady,
} from './test-utils';

/**
 * Smoke tests: every nav route must render without JS errors or crash.
 * A "crash" is defined as: no <body> content, or a React error boundary message.
 */

const ALL_PAGES = [
  { path: '/admin/overview',          label: 'Overview' },
  { path: '/admin/providers/llm',     label: 'LLM Providers' },
  { path: '/admin/providers/message', label: 'Message Providers' },
  { path: '/admin/bots',              label: 'Bots' },
  { path: '/admin/personas',          label: 'Personas' },
  { path: '/admin/guards',            label: 'Guards' },
  { path: '/admin/settings',          label: 'Settings' },
  { path: '/admin/monitoring',        label: 'Monitoring' },
  { path: '/admin/configuration',     label: 'Configuration' },
  { path: '/admin/showcase',          label: 'Showcase' },
  { path: '/admin/sitemap',           label: 'Sitemap' },
];

test.describe('Page Rendering - All Admin Pages', () => {
  test.setTimeout(90000);

  for (const { path, label } of ALL_PAGES) {
    test(`${label} renders without errors`, async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await navigateAndWaitReady(page, path);

      // Must stay on the requested route (no redirect to /login counts as a crash for smoke purposes)
      expect(page.url()).toContain(path);

      // Body must have content
      const body = page.locator('body');
      await expect(body).not.toBeEmpty();

      // No React error boundary text
      const bodyText = await body.innerText().catch(() => '');
      expect(bodyText).not.toContain('Something went wrong');
      expect(bodyText).not.toContain('Unexpected Application Error');

      await page.screenshot({ path: `test-results/pages-${label.toLowerCase().replace(/\s+/g, '-')}.png`, fullPage: true });
      await assertNoErrors(errors, `${label} page`);
    });
  }

  test('can navigate between all pages without errors', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);
    for (const { path } of ALL_PAGES) {
      await page.goto(path);
      await waitForPageReady(page);
    }
    await assertNoErrors(errors, 'Multi-page navigation');
  });

  test.describe('Responsive Design', () => {
    test('renders on mobile viewport without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateAndWaitReady(page, '/admin/bots');
      await page.screenshot({ path: 'test-results/pages-mobile-bots.png', fullPage: true });
      await assertNoErrors(errors, 'Mobile viewport');
    });

    test('renders on tablet viewport without errors', async ({ page }) => {
      const errors = await setupTestWithErrorDetection(page);
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateAndWaitReady(page, '/admin/bots');
      await page.screenshot({ path: 'test-results/pages-tablet-bots.png', fullPage: true });
      await assertNoErrors(errors, 'Tablet viewport');
    });
  });
});
