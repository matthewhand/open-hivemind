import { test, expect } from '@playwright/test';

test('ApiDocsPage loads successfully', async ({ page }) => {
  await page.goto('/api-docs');
  await expect(page.getByRole('heading', { name: 'API Documentation' })).toBeVisible();
});
