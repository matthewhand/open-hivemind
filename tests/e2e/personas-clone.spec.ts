import { expect, test } from '@playwright/test';
import { assertNoErrors, navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

test.describe('Personas Cloning', () => {
  test.setTimeout(90000);

  test('can clone a custom persona', async ({ page }) => {
    // Mock API responses to avoid backend dependency/slowness
    await page.route('**/api/config', async (route) => {
      await route.fulfill({ json: { bots: [] } });
    });

    // Mock CSRF token (important because apiService fetches it)
    await page.route('**/api/csrf-token', async (route) => {
      await route.fulfill({ status: 200, json: { token: 'mock-csrf-token' } });
    });

    // Mock other polling endpoints
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ json: { status: 'healthy' } });
    });
    await page.route('**/health', async (route) => {
      await route.fulfill({ json: { status: 'healthy' } });
    });
    await page.route('**/api/dashboard/api/status', async (route) => {
      await route.fulfill({ json: { bots: [], uptime: 100 } });
    });

    // Initial personas list
    const initialPersonas = [
      {
        id: 'default',
        name: 'Helpful Assistant',
        description: 'A friendly and helpful AI assistant',
        category: 'general',
        systemPrompt: 'You are a helpful assistant.',
        traits: [],
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedBotIds: [],
        assignedBotNames: [],
      },
    ];

    await page.route('**/api/personas', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({ json: initialPersonas });
      } else if (method === 'POST') {
        const body = route.request().postDataJSON();
        const newPersona = {
          ...body,
          id: `custom-${Date.now()}`,
          isBuiltIn: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          assignedBotIds: [],
          assignedBotNames: [],
        };
        initialPersonas.push(newPersona); // Add to "db"
        await route.fulfill({ json: newPersona, status: 201 });
      } else {
        await route.continue();
      }
    });

    // Mock clone endpoint
    await page.route('**/api/personas/*/clone', async (route) => {
      const method = route.request().method();
      const body = route.request().postDataJSON();
      // Extract ID from URL
      const url = route.request().url();
      const parts = url.split('/');
      const idIndex = parts.indexOf('clone') - 1;
      const id = parts[idIndex];

      const original = initialPersonas.find((p) => p.id === id);
      if (!original) {
        await route.fulfill({ status: 404, json: { error: 'Not found' } });
        return;
      }

      const clonedPersona = {
        ...original,
        ...body,
        id: `cloned-${Date.now()}`,
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignedBotIds: [],
        assignedBotNames: [],
      };
      initialPersonas.push(clonedPersona);
      await route.fulfill({ json: clonedPersona, status: 201 });
    });

    const errors = await setupTestWithErrorDetection(page);
    try {
      await navigateAndWaitReady(page, '/admin/personas');

      // 1. Create a custom persona to clone
      const createButton = page.locator('button:has-text("Create Persona")').first();
      await expect(createButton).toBeVisible();
      await createButton.click();

      const timestamp = Date.now();
      const uniqueName = `Clone Source ${timestamp}`;
      const uniqueDesc = `Description to be cloned ${timestamp}`;

      // Fill in the form
      const nameInput = page.locator('input[placeholder="e.g. Friendly Helper"]');
      await expect(nameInput).toBeVisible();
      await nameInput.fill(uniqueName);

      await page.locator('input[placeholder="Short description of this persona"]').fill(uniqueDesc);

      // Save
      const saveButton = page.locator('dialog.modal[open] button.btn-primary');
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // Capture screenshot of loading button while it processes
      await page.waitForTimeout(50);
      await saveButton.screenshot({ path: 'docs/screenshots/button-loading-real-app.png' });

      // Check for errors if modal doesn't close quickly
      try {
        await expect(page.locator('dialog.modal[open]')).not.toBeVisible({ timeout: 20000 });
      } catch (e) {
        // If modal is still open, check for error message on page
        const errorAlert = page.locator('.alert-error');
        if (await errorAlert.isVisible()) {
          const errorText = await errorAlert.innerText();
          throw new Error(`Failed to create persona. Error alert: ${errorText}`);
        }
        // Check if loading spinner is still there
        const spinner = page.locator('dialog.modal[open] .loading-spinner');
        if (await spinner.isVisible()) {
          throw new Error('Timed out waiting for persona creation (still loading)');
        }
        throw e;
      }

      // Wait for the new card to appear
      const newCard = page
        .locator(`[data-testid="persona-card"]:has-text("${uniqueName}")`)
        .first();
      await expect(newCard).toBeVisible({ timeout: 15000 });

      // 2. Click the Clone button on the new card
      const cloneButton = newCard.locator('button[title="Clone Persona"]');

      await expect(cloneButton).toBeVisible();
      await cloneButton.click();

      // 3. Verify Clone Modal
      const modal = page.locator('dialog.modal[open]');
      await expect(modal).toBeVisible();

      const modalTitle = modal.locator('h3');
      await expect(modalTitle).toContainText('Clone Persona');

      // Verify pre-filled data
      const cloneNameInput = modal.locator('input[placeholder="e.g. Friendly Helper"]');
      await expect(cloneNameInput).toHaveValue(`Copy of ${uniqueName}`);

      const cloneDescInput = modal.locator(
        'input[placeholder="Short description of this persona"]'
      );
      await expect(cloneDescInput).toHaveValue(uniqueDesc);

      // 4. Submit the clone
      const cloneSubmitButton = modal.locator('button:has-text("Clone Persona")');
      await cloneSubmitButton.click();

      // 5. Verify the cloned persona exists
      try {
        await expect(modal).not.toBeVisible({ timeout: 20000 });
      } catch (e) {
        const errorAlert = page.locator('.alert-error');
        if (await errorAlert.isVisible()) {
          const errorText = await errorAlert.innerText();
          throw new Error(`Failed to clone persona. Error alert: ${errorText}`);
        }
        const spinner = page.locator('dialog.modal[open] .loading-spinner');
        if (await spinner.isVisible()) {
          throw new Error('Timed out waiting for persona clone (still loading)');
        }
        throw e;
      }

      const clonedCard = page
        .locator(`[data-testid="persona-card"]:has-text("Copy of ${uniqueName}")`)
        .first();
      await expect(clonedCard).toBeVisible({ timeout: 15000 });

      if (errors.length > 0) {
        console.warn('Errors collected:', errors);
      }
    } catch (e) {
      console.log('Test failed. Collected errors:', errors);
      throw e;
    }
  });
});
