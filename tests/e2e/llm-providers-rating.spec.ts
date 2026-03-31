import { test, expect } from '@playwright/test';
import { setupAuth } from './auth-setup';

test.describe('LLM Providers - Rating System', () => {
  const mockLlmProfiles = [
    {
      key: 'openai',
      name: 'OpenAI Settings',
      provider: 'openai',
      modelType: 'both',
      config: { apiKey: 'test-key' },
      userRating: 4.5,
    },
    {
      key: 'anthropic',
      name: 'Anthropic',
      provider: 'anthropic',
      modelType: 'chat',
      config: { apiKey: 'test-key-2' },
    },
  ];

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await page.route('**/api/config/global', route => route.fulfill({ status: 200, json: {} }));
    await page.route('**/api/config/llm-status', route => route.fulfill({ status: 200, json: {} }));
  });

  test('displays rating component and handles updates', async ({ page }) => {
    // Mock initial profiles
    await page.route('**/api/config/llm-profiles', route =>
      route.fulfill({ status: 200, json: { profiles: { llm: mockLlmProfiles } } })
    );

    // Track PUT requests to verify rating updates
    let updatedPayload: any = null;
    await page.route('**/api/config/llm-profiles/anthropic', async route => {
      if (route.request().method() === 'PUT') {
        updatedPayload = route.request().postDataJSON();
        await route.fulfill({ status: 200, json: { ...updatedPayload } });
      } else {
        await route.continue();
      }
    });

    await page.goto('/admin/providers/llm');

    // Wait for profiles to load
    await expect(page.locator('text=OpenAI Settings')).toBeVisible();
    await expect(page.locator('text=Anthropic')).toBeVisible();

    // Take screenshot of the initial state showing the rating components
    await page.screenshot({ path: 'test-results/llm-providers-rating-before.png' });

    // Verify rating value is correctly set (4.5 for OpenAI)
    const openaiRatingInput = page.locator('input[aria-label="Rate 4.5 out of 5"]').first();
    await expect(openaiRatingInput).toBeChecked();

    // Verify Anthropic has no rating (0 out of 5 checked)
    const anthropicCard = page.locator('.card:has-text("Anthropic")');
    const anthropicNoRating = anthropicCard.locator('input[aria-label="No rating"]');
    await expect(anthropicNoRating).toBeChecked();

    // Click on 5 stars for Anthropic
    const anthropic5Star = anthropicCard.locator('input[aria-label="Rate 5 out of 5"]');
    await anthropic5Star.click();

    // Take screenshot after the rating interaction
    await page.screenshot({ path: 'test-results/llm-providers-rating-after.png' });

    // Wait and verify API call was made correctly
    await page.waitForTimeout(500); // give time for the request to be captured
    expect(updatedPayload).not.toBeNull();
    expect(updatedPayload.userRating).toBe(5);
  });
});
