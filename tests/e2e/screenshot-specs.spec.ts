import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Specifications Screenshots', () => {
  test('Capture Specifications page', async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock background polling endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));

    // Mock Specifications API
    await page.route('**/api/specs', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 'spec-001',
              topic: 'API Authentication Spec',
              tags: ['security', 'api', 'jwt'],
              author: 'Security Team',
              timestamp: '2023-10-25T12:00:00Z',
            },
            {
              id: 'spec-002',
              topic: 'Bot Configuration Schema',
              tags: ['bots', 'schema', 'validation'],
              author: 'Core Engineering',
              timestamp: '2023-10-26T14:30:00Z',
            },
          ],
        },
      })
    );

    // Navigate to Specs page
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/admin/specs');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();
    await expect(page.getByText('API Authentication Spec')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/specs-page.png', fullPage: true });

    // Mock Spec Detail API before clicking to avoid race condition
    await page.route('**/api/specs/spec-001', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            id: 'spec-001',
            topic: 'API Authentication Spec',
            tags: ['security', 'api', 'jwt'],
            author: 'Security Team',
            timestamp: '2023-10-25T12:00:00Z',
            content:
              '# API Authentication Spec\n\nThis specification defines the authentication mechanisms for the REST API including JWT and API keys.\n\n## Authentication Flow\n1. User provides credentials\n2. System issues JWT token\n3. Client passes token in Authorization header',
          },
        },
      })
    );

    // Click on a spec to go to detail page
    await page.getByRole('button', { name: 'View Details' }).first().click();

    // Wait for detail page
    await expect(
      page.getByRole('heading', { name: 'API Authentication Spec', exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('This specification defines the authentication mechanisms')
    ).toBeVisible();

    // Take screenshot of detail page
    await page.screenshot({ path: 'docs/screenshots/specs-detail-page.png', fullPage: true });
  });
});
