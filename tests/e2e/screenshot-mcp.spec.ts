import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('MCP Servers Screenshots', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock background checks to prevent errors/warnings
    await page.route('**/api/health/detailed', async route => route.fulfill({ status: 200, json: { status: 'ok' } }));
    await page.route('**/api/config/llm-status', async route => route.fulfill({ status: 200, json: {
        defaultConfigured: true,
        defaultProviders: ['openai'],
        botsMissingLlmProvider: [],
        hasMissing: false
    } }));
    await page.route('**/api/config/global', async route => route.fulfill({ status: 200, json: { } }));
    await page.route('**/api/config/llm-profiles', async route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/admin/guard-profiles', async route => route.fulfill({ status: 200, json: [] }));
    await page.route('**/api/demo/status', async route => route.fulfill({ status: 200, json: { isDemo: false } }));
    await page.route('**/api/csrf-token', async route => route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } }));

    // Mock user auth check
    await page.route('**/api/auth/check', async route => route.fulfill({
        status: 200,
        json: {
            authenticated: true,
            user: { role: 'owner', username: 'admin' }
        }
    }));

    // Mock MCP Servers list
    await page.route('**/api/admin/mcp-servers', async route => route.fulfill({
        status: 200,
        json: {
            success: true,
            data: {
                servers: [
                    {
                        name: 'Code Analysis Server',
                        url: 'http://localhost:8000',
                        connected: true,
                        tools: [
                            { name: 'analyze_code', description: 'Analyzes code for bugs' },
                            { name: 'format_code', description: 'Formats code according to style' }
                        ],
                        lastConnected: new Date().toISOString(),
                        description: 'Provides code analysis tools via MCP.'
                    }
                ],
                configurations: [
                     {
                        name: 'Weather Data Service',
                        serverUrl: 'http://weather.local:3000',
                        description: 'Provides weather updates.',
                        apiKey: '********'
                    }
                ]
            }
        }
    }));
  });

  test('capture mcp servers list and modal', async ({ page }) => {
    // Navigate to MCP Servers page
    await page.goto('/admin/mcp/servers');

    // Wait for the list to load
    await expect(page.locator('h1')).toHaveText('MCP Servers');
    await expect(page.locator('.card', { hasText: 'Code Analysis Server' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Weather Data Service' })).toBeVisible();

    // Take screenshot of the list
    await page.screenshot({ path: 'docs/screenshots/mcp-servers-list.png', fullPage: true });

    // Click "Add Server"
    await page.click('text=Add Server');

    // Wait for modal
    await expect(page.locator('.modal-box')).toBeVisible();
    await expect(page.locator('.modal-box h3')).toHaveText('Add MCP Server');

    // Take screenshot of the modal
    await page.screenshot({ path: 'docs/screenshots/mcp-add-server-modal.png' });
  });
});
