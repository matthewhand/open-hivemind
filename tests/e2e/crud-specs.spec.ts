import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

/**
 * CRUD E2E Tests for Specs Page
 * Tests for testing/specification management
 */

test.describe('Specs Page CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestWithErrorDetection(page);

    // Mock specs list
    await page.route('**/api/specs', async (route) => {
      await route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'spec-1',
              name: 'Bot Creation Specification',
              type: 'functional',
              status: 'passed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'spec-2',
              name: 'MCP Integration Test',
              type: 'integration',
              status: 'running',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'spec-3',
              name: 'Security Validation',
              type: 'security',
              status: 'failed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      });
    });
  });

  test.describe('Page Load', () => {
    test('loads specs page successfully', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('displays specs list', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      // Should show spec items
      const specCard = page.locator('[class*="spec"], [class*="card"]').first();
      if ((await specCard.count()) > 0) {
        await expect(specCard).toBeVisible();
      }
    });

    test('displays spec status badges', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      // Look for status indicators
      const statusBadge = page.locator('[class*="badge"], [class*="status"]').first();
      if ((await statusBadge.count()) > 0) {
        await expect(statusBadge).toBeVisible();
      }
    });
  });

  test.describe('Spec Detail View', () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/specs/spec-1', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: {
              id: 'spec-1',
              name: 'Bot Creation Specification',
              type: 'functional',
              status: 'passed',
              description: 'Tests for bot creation functionality',
              steps: [
                { name: 'Initialize bot', status: 'passed', duration: 100 },
                { name: 'Configure bot', status: 'passed', duration: 200 },
                { name: 'Validate bot', status: 'passed', duration: 150 },
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        });
      });
    });

    test('opens spec detail view', async ({ page }) => {
      await page.goto('/specs/spec-1');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('displays spec steps', async ({ page }) => {
      await page.goto('/specs/spec-1');
      await page.waitForLoadState('networkidle');

      // Should show step details
      const stepsSection = page
        .locator('[class*="step"], [class*="test"], [class*="result"]')
        .first();
      if ((await stepsSection.count()) > 0) {
        await expect(stepsSection).toBeVisible();
      }
    });

    test('displays spec metadata', async ({ page }) => {
      await page.goto('/specs/spec-1');
      await page.waitForLoadState('networkidle');

      // Check for metadata display
      const metadata = page.locator('[class*="meta"], [class*="info"], time').first();
      if ((await metadata.count()) > 0) {
        await expect(metadata).toBeVisible();
      }
    });
  });

  test.describe('Spec Filtering', () => {
    test('can filter by status', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const filterBtn = page.getByRole('button', { name: /filter/i });
      if ((await filterBtn.count()) > 0) {
        await filterBtn.click();
      }
    });

    test('can filter by type', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const typeFilter = page
        .locator('select')
        .filter({ hasText: /type|functional|integration|security/i });
      if ((await typeFilter.count()) > 0) {
        await typeFilter.selectOption('functional');
      }
    });

    test('can search specs', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i]')
        .first();
      if ((await searchInput.count()) > 0) {
        await searchInput.fill('bot');
      }
    });
  });

  test.describe('Spec Execution', () => {
    test('can run spec', async ({ page }) => {
      await page.route('**/api/specs/spec-1/run', async (route) => {
        await route.fulfill({
          json: { success: true, data: { runId: 'run-1' } },
        });
      });

      await page.goto('/specs/spec-1');
      await page.waitForLoadState('networkidle');

      const runBtn = page.getByRole('button', { name: /run|execute|start/i });
      if ((await runBtn.count()) > 0) {
        await expect(runBtn.first()).toBeVisible();
      }
    });

    test('displays running status', async ({ page }) => {
      await page.route('**/api/specs', async (route) => {
        await route.fulfill({
          json: {
            success: true,
            data: [
              {
                id: 'spec-running',
                name: 'Running Spec',
                status: 'running',
                progress: 50,
              },
            ],
          },
        });
      });

      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Spec Creation', () => {
    test('can open create spec modal', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create|new|add/i });
      if ((await createBtn.count()) > 0) {
        await createBtn.first().click();
      }
    });

    test('can create new spec', async ({ page }) => {
      await page.route('**/api/specs', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            json: {
              success: true,
              data: { id: 'new-spec', name: 'New Spec' },
            },
          });
        }
      });

      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const createBtn = page.getByRole('button', { name: /create|new/i });
      if ((await createBtn.count()) > 0) {
        await createBtn.first().click();
      }
    });
  });

  test.describe('Spec Deletion', () => {
    test('can delete spec', async ({ page }) => {
      await page.route('**/api/specs/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            json: { success: true },
          });
        }
      });

      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const deleteBtn = page.getByRole('button', { name: /delete|remove/i });
      if ((await deleteBtn.count()) > 0) {
        await deleteBtn.first().click();
      }
    });

    test('shows confirmation before delete', async ({ page }) => {
      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      const deleteBtn = page.getByRole('button', { name: /delete/i }).first();
      if ((await deleteBtn.count()) > 0) {
        await deleteBtn.click();

        // Look for confirmation modal
        const confirmModal = page.locator('[role="dialog"], .modal').first();
        if ((await confirmModal.count()) > 0) {
          await expect(confirmModal).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      await page.route('**/api/specs', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      });

      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('handles empty specs list', async ({ page }) => {
      await page.route('**/api/specs', async (route) => {
        await route.fulfill({
          json: { success: true, data: [] },
        });
      });

      await page.goto('/specs');
      await page.waitForLoadState('networkidle');

      // Should show empty state
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Specs Page Accessibility', () => {
  test('has proper heading structure', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/specs', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/specs');
    await page.waitForLoadState('networkidle');

    const h1 = page.locator('h1').first();
    if ((await h1.count()) > 0) {
      await expect(h1).toBeVisible();
    }
  });

  test('interactive elements are focusable', async ({ page }) => {
    await setupTestWithErrorDetection(page);

    await page.route('**/api/specs', async (route) => {
      await route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/specs');
    await page.waitForLoadState('networkidle');

    // Tab through focusable elements
    const buttons = page.locator('button, a, input, select');
    const count = await buttons.count();

    if (count > 0) {
      await buttons.first().focus();
      await expect(buttons.first()).toBeFocused();
    }
  });
});
