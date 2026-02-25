import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Bot Templates Page Screenshots', () => {
  test('Capture Templates Page and Search', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock API responses
    await page.route('**/api/config/templates', async route => {
      await route.fulfill({
        json: {
          templates: [
            {
              id: 'customer-support',
              name: 'Customer Support Agent',
              description: 'A friendly agent designed to handle common customer inquiries and support tickets.',
              provider: 'slack',
              content: {
                persona: 'support-agent',
                llmProvider: 'openai'
              },
              tags: ['support', 'business', 'slack'],
              featured: true
            },
            {
              id: 'code-assistant',
              name: 'Code Reviewer',
              description: 'Analyzes code snippets and provides constructive feedback and improvements.',
              provider: 'discord',
              content: {
                persona: 'senior-dev',
                llmProvider: 'anthropic'
              },
              tags: ['coding', 'developer', 'discord']
            },
            {
              id: 'creative-writer',
              name: 'Creative Writer',
              description: 'Helps generate creative content, stories, and marketing copy.',
              provider: 'mattermost',
              content: {
                persona: 'creative',
                llmProvider: 'gemini'
              },
              tags: ['writing', 'marketing']
            }
          ]
        }
      });
    });

    // Navigate to Templates page
    await navigateAndWaitReady(page, '/admin/bots/templates');

    // Wait for content
    await expect(page.locator('h1')).toContainText('Bot Templates');
    await expect(page.getByText('Customer Support Agent')).toBeVisible();

    // Screenshot Full Page
    await page.screenshot({ path: 'docs/images/bot-templates-page.png', fullPage: true });

    // Perform Search
    const searchInput = page.getByPlaceholder('Search templates');
    await searchInput.fill('support');

    // Wait for filter to apply (client-side)
    await page.waitForTimeout(500);

    // Verify filtering
    await expect(page.getByText('Customer Support Agent')).toBeVisible();
    await expect(page.getByText('Code Reviewer')).not.toBeVisible();

    // Screenshot Search Results
    await page.screenshot({ path: 'docs/images/bot-templates-search.png', fullPage: true });
  });
});
