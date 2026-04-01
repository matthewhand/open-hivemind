import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Specs Screenshots', () => {
  test('Capture Specs page screenshot', async ({ page }) => {
    await setupAuth(page);

    // Mock background polling and page endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));

    // Mock specifications list
    await page.route('**/api/specs', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              id: 'spec-1',
              topic: 'LLM Provider Integration',
              author: 'System',
              timestamp: new Date().toISOString(),
              tags: ['architecture', 'backend', 'llm'],
            },
            {
              id: 'spec-2',
              topic: 'UI Component Library',
              author: 'Design Team',
              timestamp: new Date().toISOString(),
              tags: ['frontend', 'ui', 'design'],
            },
            {
              id: 'spec-3',
              topic: 'Authentication Flow',
              author: 'Security',
              timestamp: new Date().toISOString(),
              tags: ['security', 'auth'],
            }
          ]
        }
      })
    );

    await page.goto('/admin/specs');

    // Take the screenshot
    await page.waitForTimeout(2000); // Wait for React to render
    await page.screenshot({ path: 'docs/screenshots/specs-page.png', fullPage: true });
  });

  test('Capture Spec Details page screenshot', async ({ page }) => {
    await setupAuth(page);

    // Mock background polling and page endpoints
    await page.route('**/api/health/**', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );
    await page.route('**/api/config/**', async (route) => route.fulfill({ status: 200, json: {} }));

    // Mock a single spec details
    await page.route('**/api/specs/spec-1', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            id: 'spec-1',
            topic: 'LLM Provider Integration',
            author: 'System',
            timestamp: new Date().toISOString(),
            tags: ['architecture', 'backend', 'llm'],
            content: '# LLM Provider Integration\n\nThis specification outlines the architecture for integrating new Large Language Models into the system.\n\n## Overview\nThe integration involves creating a new provider class that implements the `LLMProvider` interface.'
          }
        }
      })
    );

    await page.goto('/admin/specs/spec-1');

    // Take the screenshot
    await page.waitForTimeout(2000); // Wait for React to render
    await page.screenshot({ path: 'docs/screenshots/specs-detail-page.png', fullPage: true });
  });
});
