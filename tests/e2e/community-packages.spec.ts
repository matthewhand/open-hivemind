import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupAuth, setupTestWithErrorDetection } from './test-utils';

test.describe('Community Packages Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock successful authentication check
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
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
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock Marketplace API with mix of built-in + community packages
    await page.route('/api/marketplace/packages', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            name: 'open-hivemind/local-llm',
            displayName: 'Local LLM Provider',
            description: 'Provides connection to local LLM instances via OpenAI-compatible APIs',
            version: '1.0.0',
            type: 'llm',
            status: 'built-in',
            rating: 5,
            repoUrl: 'https://github.com/open-hivemind/local-llm',
          },
          {
            name: 'open-hivemind/discord-provider',
            displayName: 'Discord Message Provider',
            description: 'Official Discord integration for open-hivemind bots',
            version: '2.3.1',
            type: 'message',
            status: 'built-in',
            rating: 4,
            repoUrl: 'https://github.com/open-hivemind/discord-provider',
          },
          {
            name: 'community/advanced-tools',
            displayName: 'Advanced Tools Pack',
            description:
              'Collection of advanced tools including web search, code execution, and file management',
            version: '2.1.0',
            type: 'tool',
            status: 'available',
            rating: 3,
            repoUrl: 'https://github.com/community/advanced-tools',
            feedbackUrl: 'https://github.com/community/advanced-tools/issues',
          },
          {
            name: 'community/vector-memory',
            displayName: 'Vector Memory Store',
            description: 'High-performance vector-based memory storage using FAISS',
            version: '0.9.2',
            type: 'memory',
            status: 'installed',
            rating: 4,
            repoUrl: 'https://github.com/community/vector-memory',
            feedbackUrl: 'https://github.com/community/vector-memory/discussions',
          },
        ]),
      });
    });
  });

  test('Community Packages page shows title, warning, ratings, and feedback', async ({ page }) => {
    // Setup error detection
    await setupTestWithErrorDetection(page);

    // Navigate to the marketplace page
    await navigateAndWaitReady(page, '/admin/marketplace');

    // Wait for packages to load
    await page.waitForSelector('h1', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify the page title says "Community Packages"
    const title = page.locator('h1');
    await expect(title).toHaveText('Community Packages');

    // Verify the warning banner appears (community packages exist in mock data)
    const warningBanner = page.locator('[data-testid="community-warning-banner"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner).toContainText('Community packages are not officially maintained');

    // Verify package cards are present
    const packageCards = page.locator('.card');
    const cardCount = await packageCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);

    // Verify at least one built-in package badge
    const builtInBadge = page.locator('span:has-text("Built-in")');
    await expect(builtInBadge.first()).toBeVisible();

    // Verify star ratings are present and clickable
    const starRating = page.locator('[data-testid="star-rating-community/advanced-tools"]');
    await expect(starRating).toBeVisible();

    // Click a star to rate a package
    const fourthStar = starRating.locator('[data-testid="star-4"]');
    await fourthStar.click();

    // Verify the star is now filled (has fill-warning class)
    const starIcon = fourthStar.locator('svg');
    await expect(starIcon).toHaveClass(/fill-warning/);

    // Verify Feedback links are present for community packages
    const feedbackLink = page.locator('[data-testid="feedback-link-community/advanced-tools"]');
    await expect(feedbackLink).toBeVisible();
    await expect(feedbackLink).toContainText('Feedback');

    const feedbackLink2 = page.locator('[data-testid="feedback-link-community/vector-memory"]');
    await expect(feedbackLink2).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'docs/screenshots/community-packages.png',
      fullPage: true,
    });
  });
});
