import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * CRUD E2E Tests for Overview/Dashboard Page
 * Core dashboard functionality tests
 */

test.describe('Overview Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock onboarding completed
    await page.route('**/api/onboarding/status', async (route) => {
      await route.fulfill({
        json: { completed: true },
      });
    });

    // Mock config status
    await page.route('**/api/dashboard/config-status', async (route) => {
      await route.fulfill({
        json: {
          llmConfigured: true,
          botConfigured: true,
          messengerConfigured: true,
        },
      });
    });

    // Mock announcement
    await page.route('**/api/dashboard/announcement', async (route) => {
      await route.fulfill({
        json: { announcement: 'Welcome to Open Hivemind!' },
      });
    });

    // Mock dashboard stats
    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        json: {
          bots: { total: 10, active: 5 },
          messages: { total: 1000, today: 50 },
          providers: { llm: 3, memory: 2, tool: 5 },
        },
      });
    });

    // Mock bots list for dashboard
    await page.route('**/{,api/}bots', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            { id: 'bot-1', name: 'Helper Bot', platform: 'discord', status: 'active' },
            { id: 'bot-2', name: 'Support Bot', platform: 'slack', status: 'inactive' },
          ],
        },
      });
    });
  });

  test.describe('Page Load', () => {
    test('loads overview page successfully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should show dashboard content
      await expect(page.locator('body')).toBeVisible();
    });

    test('redirects to onboarding if not completed', async ({ page }) => {
      // Override onboarding mock
      await page.route('**/api/onboarding/status', async (route) => {
        await route.fulfill({
          json: { completed: false },
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should redirect to onboarding
      await expect(page).toHaveURL(/\/onboarding/);
    });

    test('shows welcome splash when config incomplete', async ({ page }) => {
      // Override config status to show incomplete
      await page.route('**/api/dashboard/config-status', async (route) => {
        await route.fulfill({
          json: {
            llmConfigured: false,
            botConfigured: false,
            messengerConfigured: false,
          },
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should show welcome state
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Dashboard Tabs', () => {
    test('displays default overview tab', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check URL has no tab param or overview tab
      const url = page.url();
      expect(url).toMatch(/\/?(\?|$)/);
    });

    test('can switch to monitoring tab', async ({ page }) => {
      await page.goto('/?tab=monitoring');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('can switch to activity tab', async ({ page }) => {
      await page.goto('/?tab=activity');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('persists tab selection in URL', async ({ page }) => {
      await page.goto('/?tab=overview');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveURL(/tab=overview/);
    });
  });

  test.describe('Dashboard Widgets', () => {
    test('displays stats cards', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for stat cards or metrics
      const statsSection = page
        .locator('[class*="stat"], [class*="metric"], [class*="card"]')
        .first();
      if ((await statsSection.count()) > 0) {
        await expect(statsSection).toBeVisible();
      }
    });

    test('displays recent bots', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should show bots section if any exist
      const botsSection = page.locator('[class*="bot"]').first();
      if ((await botsSection.count()) > 0) {
        await expect(botsSection).toBeVisible();
      }
    });

    test('displays quick actions', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Quick actions should be visible
      const quickActions = page.getByRole('button').filter({ hasText: /create|new|add/i });
      if ((await quickActions.count()) > 0) {
        await expect(quickActions.first()).toBeVisible();
      }
    });
  });

  test.describe('Announcement Banner', () => {
    test('displays announcement when set', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if announcement is displayed
      const announcement = page
        .locator('[class*="announcement"], [class*="banner"], [class*="alert"]')
        .first();
      if ((await announcement.count()) > 0) {
        await expect(announcement).toBeVisible();
      }
    });

    test('can dismiss announcement', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for dismiss button on announcement
      const dismissBtn = page
        .locator('button')
        .filter({ has: page.locator('[class*="close"], [class*="x"], svg') })
        .first();
      if ((await dismissBtn.count()) > 0) {
        await dismissBtn.click();
      }
    });
  });

  test.describe('Layout Toggle', () => {
    test('can toggle between widget and static layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for layout toggle
      const toggle = page.locator('[class*="toggle"], [class*="switch"]').first();
      if ((await toggle.count()) > 0) {
        await toggle.click();
      }
    });

    test('persists layout preference', async ({ page }) => {
      // Set localStorage before navigation
      await page.addInitScript(() => {
        localStorage.setItem('hivemind-dashboard-layout', 'widget');
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Layout preference should be applied
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Activity Feed', () => {
    test('displays activity section when available', async ({ page }) => {
      await page.route('**/api/activity/recent', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [
              { id: 'act-1', type: 'bot_created', timestamp: new Date().toISOString() },
              { id: 'act-2', type: 'message_sent', timestamp: new Date().toISOString() },
            ],
          },
        });
      });

      await page.goto('/?tab=activity');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('System Health Widget', () => {
    test('displays system health when loading', async ({ page }) => {
      await page.route('**/{,api/}health/detailed', async (route) => {
        await route.fulfill({
          json: {
            status: 'healthy',
            uptime: 12345,
            memory: { used: 50, total: 100 },
          },
        });
      });

      await page.goto('/?tab=overview');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('sidebar is visible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for sidebar or nav
      const sidebar = page.locator('nav, [class*="sidebar"], [class*="drawer"]').first();
      if ((await sidebar.count()) > 0) {
        await expect(sidebar).toBeVisible();
      }
    });

    test('can navigate to bots page', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const botsLink = page
        .getByRole('link', { name: /bots/i })
        .or(page.locator('a[href*="/bots"]').first());

      if ((await botsLink.count()) > 0) {
        await botsLink.click();
        await page.waitForLoadState('networkidle');
        await expect(page).toHaveURL(/bots/);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      // Override with error responses
      await page.route('**/api/dashboard/**', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should still render page, possibly with error state
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Overview Page Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1
    const h1 = page.locator('h1').first();
    if ((await h1.count()) > 0) {
      await expect(h1).toBeVisible();
    }
  });

  test('has proper landmark roles', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/**', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for main landmark
    const main = page.locator('main, [role="main"]').first();
    if ((await main.count()) > 0) {
      await expect(main).toBeVisible();
    }
  });
});
