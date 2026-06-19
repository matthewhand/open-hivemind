import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('ApiDocsPage loads successfully', async ({ page }) => {
  // /admin/api-docs is behind the auth guard — without a session it redirects to
  // /login and the heading never renders.
  await setupAuth(page);

  // Mock the route-introspection endpoint so the page renders deterministically
  // instead of depending on the live server's generated route list.
  await page.route('**/api/docs', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          groups: [
            {
              prefix: '/api/bots',
              label: 'Bots',
              routes: [
                {
                  method: 'GET',
                  path: '/api/bots',
                  middleware: ['requireAuth'],
                  description: 'List bots',
                  tag: 'bots',
                },
              ],
            },
          ],
        },
      }),
    })
  );

  await page.goto('/admin/api-docs');
  await expect(page.getByRole('heading', { name: 'API Documentation' })).toBeVisible();
});
