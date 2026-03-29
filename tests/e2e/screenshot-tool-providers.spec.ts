import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Tool Providers Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints to prevent errors/warnings
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: true,
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );
    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock tool profiles data
    await page.route('**/api/config/tool-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          tool: [
            {
              key: 'github-integration',
              name: 'GitHub Integration',
              type: 'github',
              provider: 'GitHub API',
              config: {
                repo: 'open-hivemind/core',
              },
              inUseBy: ['dev-bot'],
              isDefault: false,
            },
            {
              key: 'jira-tracker',
              name: 'Jira Tracker',
              type: 'jira',
              provider: 'Jira Software',
              config: {
                host: 'hivemind.atlassian.net',
              },
              inUseBy: ['pm-bot', 'dev-bot'],
              isDefault: true,
            },
            {
              key: 'google-search',
              name: 'Google Search',
              type: 'search',
              provider: 'Google Custom Search',
              config: {},
              inUseBy: ['research-bot'],
              isDefault: false,
            },
          ],
        },
      });
    });
  });

  test('Tool Providers List', async ({ page }) => {
    // Navigate to Tool Providers page
    await page.goto('/admin/providers/tool');

    // Wait for the page to load
    await expect(page.locator('text=Tool Providers').first()).toBeVisible();
    await expect(page.locator('text=github-integration').first()).toBeVisible();

    // Take screenshot of the entire page
    await page.screenshot({
      path: 'docs/screenshots/tool-providers-list.png',
      fullPage: true,
    });
  });
});
