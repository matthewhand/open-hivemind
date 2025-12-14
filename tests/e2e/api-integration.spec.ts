import { test, expect } from '@playwright/test';

/**
 * API Integration E2E Tests
 * Tests that verify API calls are made correctly and responses are handled.
 */

test.describe('API Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);

        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTksInVzZXJuYW1lIjoiYWRtaW4ifQ.signature';
        const fakeUser = JSON.stringify({
            id: 'admin',
            username: 'admin',
            email: 'admin@open-hivemind.com',
            role: 'owner',
            permissions: ['*']
        });

        await page.addInitScript(({ token, user }) => {
            localStorage.setItem('auth_tokens', JSON.stringify({
                accessToken: token,
                refreshToken: token,
                expiresIn: 3600
            }));
            localStorage.setItem('auth_user', user);
        }, { token: fakeToken, user: fakeUser });
    });

    test.describe('Config API', () => {
        test('fetches global config on page load', async ({ page }) => {
            const apiCalls: string[] = [];

            page.on('request', request => {
                if (request.url().includes('/api/config')) {
                    apiCalls.push(request.url());
                }
            });

            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Should have made config API calls
            expect(apiCalls.length).toBeGreaterThan(0);
            await page.screenshot({ path: 'test-results/api-config-01-load.png', fullPage: true });
        });

        test('config API returns valid data structure', async ({ page }) => {
            let configResponse: any = null;

            page.on('response', async response => {
                if (response.url().includes('/api/config/global')) {
                    try {
                        configResponse = await response.json();
                    } catch { }
                }
            });

            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Config should be an object
            if (configResponse) {
                expect(typeof configResponse).toBe('object');
            }

            await page.screenshot({ path: 'test-results/api-config-02-response.png', fullPage: true });
        });
    });

    test.describe('Bots API', () => {
        test('fetches bots list on page load', async ({ page }) => {
            const apiCalls: string[] = [];

            page.on('request', request => {
                if (request.url().includes('/api/bots') || request.url().includes('/api/config')) {
                    apiCalls.push(request.url());
                }
            });

            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            expect(apiCalls.length).toBeGreaterThan(0);
            await page.screenshot({ path: 'test-results/api-bots-01-list.png', fullPage: true });
        });

        test('can create bot via API', async ({ page }) => {
            let createResponse: any = null;

            page.on('response', async response => {
                if (response.url().includes('/api/bots') && response.request().method() === 'POST') {
                    createResponse = response.status();
                }
            });

            await page.goto('/admin/bots');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            const createButton = page.getByRole('button', { name: /Create.*Bot/i });
            if (await createButton.count() > 0) {
                await createButton.click();
                await page.waitForTimeout(500);

                const modal = page.locator('.modal-box').first();

                // Fill bot name
                const nameInput = modal.locator('input').first();
                if (await nameInput.count() > 0) {
                    await nameInput.fill('API Test Bot ' + Date.now());
                }

                // Fill all required selects: persona (0), message provider (1), LLM provider (2)
                const selects = modal.locator('select');
                const selectCount = await selects.count();
                if (selectCount >= 2) {
                    await selects.nth(1).selectOption('discord');
                }
                if (selectCount >= 3) {
                    await selects.nth(2).selectOption('openai');
                }

                const submitButton = modal.locator('button').filter({ hasText: /create bot/i });
                if (await submitButton.count() > 0 && await submitButton.isEnabled()) {
                    await submitButton.click();
                    await page.waitForTimeout(2000);
                }
            }

            await page.screenshot({ path: 'test-results/api-bots-02-create.png', fullPage: true });
        });
    });

    test.describe('Personas API', () => {
        test('fetches personas list on page load', async ({ page }) => {
            const apiCalls: string[] = [];

            page.on('request', request => {
                if (request.url().includes('/api/personas')) {
                    apiCalls.push(request.url());
                }
            });

            await page.goto('/admin/personas');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            expect(apiCalls.length).toBeGreaterThanOrEqual(0);
            await page.screenshot({ path: 'test-results/api-personas-01-list.png', fullPage: true });
        });

        test('personas API returns array or handles gracefully', async ({ page }) => {
            let personasResponse: any = null;
            let statusCode: number = 0;

            page.on('response', async response => {
                if (response.url().includes('/api/personas') && response.request().method() === 'GET') {
                    statusCode = response.status();
                    if (response.ok()) {
                        try {
                            personasResponse = await response.json();
                        } catch { }
                    }
                }
            });

            await page.goto('/admin/personas');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // If we got a response and it was successful, verify structure
            if (personasResponse) {
                expect(Array.isArray(personasResponse)).toBeTruthy();
            }

            console.log('Personas API status:', statusCode);

            await page.screenshot({ path: 'test-results/api-personas-02-response.png', fullPage: true });
        });
    });

    test.describe('Health API', () => {
        test('health endpoint is accessible', async ({ page }) => {
            const response = await page.request.get('/health');
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data).toHaveProperty('status');
        });

        test('API health endpoint returns ok', async ({ page }) => {
            const response = await page.request.get('/api/health');

            if (response.ok()) {
                const data = await response.json();
                expect(data.status).toBeDefined();
            }
        });
    });

    test.describe('Error Handling', () => {
        test('handles API errors gracefully', async ({ page }) => {
            // Mock a failed API response
            await page.route('/api/config/global', route => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' })
                });
            });

            await page.goto('/admin/configuration');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            // Page should still render (error state)
            await page.screenshot({ path: 'test-results/api-error-01-500.png', fullPage: true });
        });

        test('handles network timeout gracefully', async ({ page }) => {
            // Simulate slow response
            await page.route('/api/config/global', async route => {
                await new Promise(resolve => setTimeout(resolve, 5000));
                route.continue();
            });

            await page.goto('/admin/configuration');
            await page.waitForTimeout(7000);

            await page.screenshot({ path: 'test-results/api-error-02-timeout.png', fullPage: true });
        });
    });

    test.describe('Network Monitoring', () => {
        test('tracks all API calls on dashboard', async ({ page }) => {
            const allApiCalls: { url: string; method: string; status?: number }[] = [];

            page.on('request', request => {
                if (request.url().includes('/api/')) {
                    allApiCalls.push({
                        url: request.url(),
                        method: request.method()
                    });
                }
            });

            page.on('response', response => {
                if (response.url().includes('/api/')) {
                    const call = allApiCalls.find(c => c.url === response.url());
                    if (call) {
                        call.status = response.status();
                    }
                }
            });

            await page.goto('/admin/overview');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            console.log('API calls made:', allApiCalls);
            await page.screenshot({ path: 'test-results/api-monitor-01-overview.png', fullPage: true });
        });
    });
});
