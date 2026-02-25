import { test, expect } from '@playwright/test';
import { setupTestWithErrorDetection, navigateAndWaitReady } from './test-utils';

test.describe('Enhanced Monitoring Dashboard Screenshots', () => {
  test('Capture Monitoring Page with Diagnostics', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Mock WebSocket (if needed, but we are primarily testing REST data here)
    // The page fetches diagnostics on load.

    // Mock Recovery Data
    await page.route('**/health/recovery', async route => {
      await route.fulfill({
        json: {
          timestamp: new Date().toISOString(),
          circuitBreakers: [
            { operation: 'database', state: 'closed', failureCount: 0, successCount: 1500, fallbacks: 0 },
            { operation: 'openai-api', state: 'half-open', failureCount: 2, successCount: 5, fallbacks: 12 },
            { operation: 'slack-webhook', state: 'closed', failureCount: 0, successCount: 45, fallbacks: 0 }
          ],
          health: {
            status: 'degraded',
            recommendations: ['Check connectivity to OpenAI API.', 'Monitor retry rates.']
          }
        }
      });
    });

    // Mock Error Data
    await page.route('**/health/errors', async route => {
      await route.fulfill({
        json: {
          timestamp: new Date().toISOString(),
          errors: {
            total: 145,
            recent: 12,
            rate: 0.2,
            byType: {
              'timeout': 45,
              'validation': 30,
              'auth': 10,
              'network': 60
            },
            trends: { lastMinute: 2, last5Minutes: 12, last15Minutes: 40 }
          },
          health: {
            status: 'fair',
            recommendations: ['Optimize timeout settings for external services.', 'Review validation schemas.']
          }
        }
      });
    });

    // Mock Metrics (WebSocket fallback or initial fetch if implemented)
    // For visual testing, we might rely on default empty states or mocked initial data if possible.
    // The dashboard mostly relies on WebSocket for charts, but our focus is the new diagnostics panels.

    await navigateAndWaitReady(page, '/admin/monitoring-dashboard');

    // Wait for the new panels to appear
    await expect(page.locator('h2', { hasText: 'System Recovery Status' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Error Intelligence' })).toBeVisible();

    // Wait for data to load
    await expect(page.getByText('Loading recovery stats...')).not.toBeVisible();

    // Verify data is displayed
    await expect(page.getByText('openai-api')).toBeVisible();
    await expect(page.getByText('half-open')).toBeVisible();
    await expect(page.getByText('Optimize timeout settings')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'docs/images/monitoring-dashboard-enhanced.png', fullPage: true });
  });
});
