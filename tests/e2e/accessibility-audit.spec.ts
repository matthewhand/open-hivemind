import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { setupAuth, waitForPageReady } from './test-utils';

/**
 * Deep Accessibility Audit — WCAG 2.1 AA Compliance
 *
 * Uses @axe-core/playwright to perform automated accessibility scanning
 * on all major pages. Enforces zero critical/serious violations and
 * reports moderate/minor issues for tracking.
 *
 * Run: npx playwright test accessibility-audit
 */

const PAGES_TO_AUDIT = [
  { path: '/admin/overview', name: 'Dashboard' },
  { path: '/admin/bots', name: 'Bots' },
  { path: '/admin/providers/llm', name: 'LLM Providers' },
  { path: '/admin/providers/message', name: 'Message Providers' },
  { path: '/admin/guards', name: 'Guards' },
  { path: '/admin/settings', name: 'Settings' },
  { path: '/admin/personas', name: 'Personas' },
  { path: '/admin/monitoring', name: 'Monitoring' },
  { path: '/admin/configuration', name: 'Configuration' },
];

const VIOLATION_THRESHOLDS = {
  critical: 0,
  serious: 0,
  moderate: 10,
  minor: 20,
};

function setupPageMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/health/detailed', (route) =>
      route.fulfill({ status: 200, json: { status: 'healthy', uptime: 86400 } })
    ),
    page.route('**/api/config', (route) =>
      route.fulfill({
        status: 200,
        json: {
          bots: [
            {
              id: 'a11y-bot',
              name: 'A11y Bot',
              provider: 'discord',
              status: 'running',
              connected: true,
              messageCount: 5,
              errorCount: 0,
            },
          ],
        },
      })
    ),
    page.route('**/api/personas', (route) =>
      route.fulfill({ status: 200, json: [{ id: 'p1', name: 'Persona', description: 'Test' }] })
    ),
    page.route('**/api/guards', (route) =>
      route.fulfill({ status: 200, json: { guards: [{ id: 'g1', name: 'Guard', enabled: true }] } })
    ),
    page.route('**/api/admin/llm-profiles', (route) =>
      route.fulfill({
        status: 200,
        json: [{ id: 'l1', name: 'OpenAI', provider: 'openai', model: 'gpt-4' }],
      })
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
    page.route('**/api/csrf-token', (route) =>
      route.fulfill({ status: 200, json: { token: 'a11y-csrf' } })
    ),
    page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
    page.route('**/api/dashboard/api/status', (route) =>
      route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
    ),
    page.route('**/api/demo/status', (route) =>
      route.fulfill({ status: 200, json: { active: false } })
    ),
    page.route('**/api/monitoring/**', (route) =>
      route.fulfill({ status: 200, json: { metrics: [], events: [] } })
    ),
    page.route('**/api/message-providers', (route) =>
      route.fulfill({
        status: 200,
        json: [{ id: 'mp1', name: 'Discord', type: 'discord', status: 'connected' }],
      })
    ),
  ]);
}

test.describe('Accessibility Audit — WCAG 2.1 AA', () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupPageMocks(page);
  });

  for (const { path, name } of PAGES_TO_AUDIT) {
    test(`${name} page passes WCAG 2.1 AA audit`, async ({ page }) => {
      await page.goto(path);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('[aria-hidden="true"]')
        .analyze();

      const critical = results.violations.filter((v) => v.impact === 'critical');
      const serious = results.violations.filter((v) => v.impact === 'serious');
      const moderate = results.violations.filter((v) => v.impact === 'moderate');
      const minor = results.violations.filter((v) => v.impact === 'minor');

      if (results.violations.length > 0) {
        console.log(`\n📋 A11y Audit: ${name} (${path})`);
        console.log(
          `   Critical: ${critical.length}, Serious: ${serious.length}, Moderate: ${moderate.length}, Minor: ${minor.length}`
        );
        for (const v of [...critical, ...serious]) {
          console.log(
            `   ❌ [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
          );
        }
      }

      expect(
        critical.length,
        `Critical violations on ${name}: ${critical.map((v) => v.id).join(', ')}`
      ).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.critical);
      expect(
        serious.length,
        `Serious violations on ${name}: ${serious.map((v) => v.id).join(', ')}`
      ).toBeLessThanOrEqual(VIOLATION_THRESHOLDS.serious);
      expect(moderate.length, `Moderate violations on ${name}`).toBeLessThanOrEqual(
        VIOLATION_THRESHOLDS.moderate
      );
      expect(minor.length, `Minor violations on ${name}`).toBeLessThanOrEqual(
        VIOLATION_THRESHOLDS.minor
      );
    });
  }

  test('color contrast meets AA ratio across all pages', async ({ page }) => {
    const contrastIssues: { page: string; count: number; details: string[] }[] = [];

    for (const { path, name } of PAGES_TO_AUDIT) {
      await page.goto(path);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();

      if (results.violations.length > 0) {
        contrastIssues.push({
          page: name,
          count: results.violations[0].nodes.length,
          details: results.violations[0].nodes.slice(0, 3).map((n) => n.html),
        });
      }
    }

    if (contrastIssues.length > 0) {
      console.log('\n🎨 Color Contrast Issues:');
      for (const issue of contrastIssues) {
        console.log(`   ${issue.page}: ${issue.count} elements`);
      }
    }

    const totalContrastIssues = contrastIssues.reduce((sum, i) => sum + i.count, 0);
    expect(
      totalContrastIssues,
      'Total color contrast violations across all pages'
    ).toBeLessThanOrEqual(15);
  });

  test('keyboard navigation works on interactive elements', async ({ page }) => {
    await page.goto('/admin/bots');
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(['keyboard', 'focus-order-semantics', 'tabindex'])
      .analyze();

    const violations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(
      violations.length,
      `Keyboard navigation violations: ${violations.map((v) => v.id).join(', ')}`
    ).toBe(0);
  });

  test('ARIA attributes are valid and complete', async ({ page }) => {
    const ariaIssues: { page: string; violations: string[] }[] = [];

    for (const { path, name } of PAGES_TO_AUDIT.slice(0, 5)) {
      await page.goto(path);
      await waitForPageReady(page);

      const results = await new AxeBuilder({ page })
        .withRules([
          'aria-allowed-attr',
          'aria-required-attr',
          'aria-valid-attr',
          'aria-valid-attr-value',
          'aria-roles',
        ])
        .analyze();

      if (results.violations.length > 0) {
        ariaIssues.push({
          page: name,
          violations: results.violations.map((v) => `${v.id} (${v.nodes.length} nodes)`),
        });
      }
    }

    const totalAriaViolations = ariaIssues.reduce((sum, i) => sum + i.violations.length, 0);
    expect(
      totalAriaViolations,
      `ARIA violations: ${JSON.stringify(ariaIssues)}`
    ).toBeLessThanOrEqual(3);
  });

  test('images and icons have accessible names', async ({ page }) => {
    await page.goto('/admin/overview');
    await waitForPageReady(page);

    const results = await new AxeBuilder({ page })
      .withRules(['image-alt', 'svg-img-alt', 'input-image-alt'])
      .analyze();

    expect(results.violations.length, 'Images/icons missing alt text').toBeLessThanOrEqual(2);
  });
});
