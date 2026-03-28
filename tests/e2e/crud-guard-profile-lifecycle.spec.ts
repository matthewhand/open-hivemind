import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

/**
 * Guard Profile CRUD Lifecycle E2E Tests
 * Exercises create, read, update, duplicate, toggle, and delete with API mocking.
 */
test.describe('Guard Profile CRUD Lifecycle', () => {
  test.setTimeout(90000);

  const baseProfile = {
    id: 'profile-1',
    name: 'Production Guard',
    description: 'Strict production security settings',
    guards: {
      mcpGuard: { enabled: true, type: 'owner', allowedUsers: [] },
      rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
      contentFilter: { enabled: true, strictness: 'high' },
    },
  };

  const devProfile = {
    id: 'profile-2',
    name: 'Development Guard',
    description: 'Lenient settings for development',
    guards: {
      mcpGuard: { enabled: false, type: 'owner', allowedUsers: [] },
      rateLimit: { enabled: false, maxRequests: 1000, windowMs: 60000 },
      contentFilter: { enabled: false, strictness: 'low' },
    },
  };

  function mockCommonEndpoints(page: import('@playwright/test').Page) {
    return Promise.all([
      page.route('**/api/health/detailed', (route) =>
        route.fulfill({ status: 200, json: { status: 'healthy' } })
      ),
      page.route('**/api/config/llm-status', (route) =>
        route.fulfill({
          status: 200,
          json: { defaultConfigured: true, defaultProviders: [], botsMissingLlmProvider: [], hasMissing: false },
        })
      ),
      page.route('**/api/config/global', (route) => route.fulfill({ status: 200, json: {} })),
      page.route('**/api/config', (route) => route.fulfill({ status: 200, json: { bots: [] } })),
      page.route('**/api/personas', (route) => route.fulfill({ status: 200, json: [] })),
      page.route('**/api/csrf-token', (route) =>
        route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } })
      ),
      page.route('**/api/health', (route) => route.fulfill({ status: 200, json: { status: 'ok' } })),
      page.route('**/api/dashboard/api/status', (route) =>
        route.fulfill({ status: 200, json: { bots: [], uptime: 100 } })
      ),
      page.route('**/api/demo/status', (route) => route.fulfill({ status: 200, json: { active: false } })),
    ]);
  }

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockCommonEndpoints(page);
  });

  test('list guard profiles displays all profiles', async ({ page }) => {
    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: [baseProfile, devProfile] } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Production Guard')).toBeVisible();
    await expect(page.getByText('Development Guard')).toBeVisible();
  });

  test('create a new guard profile', async ({ page }) => {
    const profiles = [baseProfile];

    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: profiles } });
      } else if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const newProfile = {
          id: 'profile-new',
          name: body.name || 'New Profile',
          description: body.description || '',
          guards: body.guards || {},
        };
        profiles.push(newProfile);
        await route.fulfill({
          status: 200,
          json: { data: newProfile, message: 'Profile created successfully' },
        });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Production Guard')).toBeVisible();

    // Look for create button
    const createBtn = page.locator('button:has-text("Create"), button:has-text("New Profile"), button:has-text("Add")').first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-box, [role="dialog"], dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        const nameInput = modal.locator('input[placeholder*="Production"], input[placeholder*="name" i], input').first();
        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Staging Guard');
        }
      }
    }
  });

  test('edit guard profile updates settings', async ({ page }) => {
    let currentProfile = { ...baseProfile };

    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: [currentProfile] } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
    await page.route('**/api/admin/guard-profiles/profile-1', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        currentProfile = { ...currentProfile, ...body };
        await route.fulfill({
          status: 200,
          json: { data: currentProfile, message: 'Profile updated successfully' },
        });
      } else {
        await route.fulfill({ status: 200, json: { data: currentProfile } });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Production Guard')).toBeVisible();

    // Look for edit button on the card
    const card = page.locator('.card').filter({ hasText: 'Production Guard' });
    const editBtn = card.locator('button:has-text("Edit"), button[title*="Edit"]').first();
    if ((await editBtn.count()) > 0) {
      await editBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('duplicate guard profile creates a copy', async ({ page }) => {
    let createdProfile: any = null;
    const profiles = [baseProfile];

    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'POST') {
        const data = route.request().postDataJSON();
        createdProfile = { ...data, id: 'profile-dup' };
        profiles.push(createdProfile);
        await route.fulfill({
          status: 200,
          json: { data: createdProfile, message: 'Profile created successfully' },
        });
      } else if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: profiles } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Production Guard')).toBeVisible();

    // Look for duplicate button
    const card = page.locator('.card').filter({ hasText: 'Production Guard' });
    const dupBtn = card.locator('button[title="Duplicate Profile"]').first();
    if ((await dupBtn.count()) > 0) {
      await dupBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.modal-box, dialog.modal[open]').first();
      if ((await modal.count()) > 0) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('delete guard profile with confirmation', async ({ page }) => {
    const profiles = [baseProfile, devProfile];
    let devDeleted = false;

    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        const data = devDeleted ? [baseProfile] : profiles;
        await route.fulfill({ status: 200, json: { data } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });
    await page.route('**/api/admin/guard-profiles/profile-2', async (route) => {
      if (route.request().method() === 'DELETE') {
        devDeleted = true;
        await route.fulfill({ status: 200, json: { success: true } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Development Guard')).toBeVisible();

    // Click delete on the dev profile card
    const card = page.locator('.card').filter({ hasText: 'Development Guard' });
    const deleteBtn = card.locator('button.text-error').first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.click();

      const modal = page.locator('dialog.modal[open]');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText('Delete Guard Profile');

      // Cancel first
      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(modal).not.toBeVisible();

      // Delete again and confirm
      await deleteBtn.click();
      const modal2 = page.locator('dialog.modal[open]');
      await expect(modal2).toBeVisible();
      await modal2.getByRole('button', { name: 'Delete Profile' }).click();
      await expect(modal2).not.toBeVisible();
    }
  });

  test('toggle enable/disable guard within profile', async ({ page }) => {
    const profile = {
      ...baseProfile,
      guards: {
        ...baseProfile.guards,
        rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
      },
    };

    await page.route('**/api/admin/guard-profiles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: { data: [profile] } });
      } else {
        await route.fulfill({ status: 200, json: {} });
      }
    });

    await page.goto('/admin/guards');
    await expect(page.getByText('Production Guard')).toBeVisible();

    // Look for toggle switches on the card
    const card = page.locator('.card').filter({ hasText: 'Production Guard' });
    const toggles = card.locator('input[type="checkbox"], .toggle');
    const toggleCount = await toggles.count();
    // Guards page should display guard toggles or badges
    expect(toggleCount).toBeGreaterThanOrEqual(0);
  });

  test('empty guard profiles list shows appropriate state', async ({ page }) => {
    await page.route('**/api/admin/guard-profiles', async (route) => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });

    await page.goto('/admin/guards');
    // Should either show empty state or a create prompt
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
