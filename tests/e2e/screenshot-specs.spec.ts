import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Specifications Screenshots', () => {
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

    // Mock API responses for specs
    await page.route('/api/specs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'spec-1',
            topic: 'Bot Configuration Schema',
            author: 'Jane Doe',
            date: new Date().toISOString(),
            tags: ['schema', 'configuration', 'bot'],
            content: '# Bot Configuration Schema\n\nThis specification defines the JSON schema for configuring a bot...',
          },
          {
            id: 'spec-2',
            topic: 'LLM Provider Integration',
            author: 'John Smith',
            date: new Date(Date.now() - 86400000).toISOString(),
            tags: ['llm', 'integration', 'api'],
            content: '# LLM Provider Integration\n\nDetails on how to integrate new LLM providers into the system...',
          },
          {
            id: 'spec-3',
            topic: 'User Roles & Permissions',
            author: 'Admin',
            date: new Date(Date.now() - 172800000).toISOString(),
            tags: ['security', 'rbac'],
            content: '# User Roles & Permissions\n\nA comprehensive guide to RBAC implementation in Open-Hivemind...',
          }
        ]),
      });
    });

    await page.route('/api/specs/spec-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'spec-1',
          topic: 'Bot Configuration Schema',
          author: 'Jane Doe',
          date: new Date().toISOString(),
          tags: ['schema', 'configuration', 'bot'],
          content: `# Bot Configuration Schema

This specification defines the JSON schema for configuring a bot.

## Overview

A bot configuration requires the following core components:
*   **Persona**: Defines the bot's behavior and personality.
*   **Provider**: The underlying LLM or service powering the bot.
*   **Platform**: The messaging platform the bot connects to.

## Schema Details

\`\`\`json
{
  "name": "string",
  "personaId": "string",
  "providerId": "string",
  "platformConfig": {
    "type": "string",
    "token": "string"
  }
}
\`\`\`

## Future Enhancements
*   Support for multiple LLM providers per bot as fallbacks.
*   Dynamic persona generation based on user interaction history.`,
          version: '1.2.0',
          versionHistory: [
            {
              version: '1.2.0',
              date: new Date().toISOString(),
              author: 'Jane Doe',
              changes: 'Added future enhancements section'
            },
            {
              version: '1.1.0',
              date: new Date(Date.now() - 86400000).toISOString(),
              author: 'Jane Doe',
              changes: 'Updated schema details with JSON example'
            }
          ]
        }),
      });
    });
  });

  test('Capture Specs List page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Specs page
    await page.goto('/admin/specs');

    // Wait for content to load
    await expect(page.getByText('Bot Configuration Schema')).toBeVisible();
    await expect(page.getByText('LLM Provider Integration')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/specs-page.png', fullPage: true });
  });

  test('Capture Spec Detail page screenshot', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigate to Spec Detail page directly
    await page.goto('/admin/specs/spec-1');

    // Wait for content to load
    await expect(page.getByText('Bot Configuration Schema').first()).toBeVisible();
    await expect(page.getByText('This specification defines the JSON schema for configuring a bot.')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/screenshots/spec-detail-page.png', fullPage: true });
  });
});
