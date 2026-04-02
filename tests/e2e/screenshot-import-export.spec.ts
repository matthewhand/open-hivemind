import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection, setupAuth } from './test-utils';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Import/Export Configuration Page', () => {
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
    await page.route('/api/config/llm-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/demo/status', async (route) =>
      route.fulfill({ status: 200, json: { enabled: false } })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    // Mock bot configurations API for export
    await page.route('/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Test Bot 1',
            messageProvider: 'discord',
            llmProvider: 'openai',
            status: 'active',
          },
          {
            id: 2,
            name: 'Test Bot 2',
            messageProvider: 'slack',
            llmProvider: 'anthropic',
            status: 'active',
          },
          {
            id: 3,
            name: 'Test Bot 3',
            messageProvider: 'mattermost',
            llmProvider: 'openai',
            status: 'inactive',
          },
        ]),
      });
    });

    // Mock export API
    await page.route('/api/import-export/export', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Export successful',
          data: {
            filePath: '/path/to/export.json.gz',
            size: 12345,
            checksum: 'abc123def456',
          },
        }),
      });
    });

    // Mock import API
    await page.route('/api/import-export/import', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Import successful',
          data: {
            importedCount: 2,
            skippedCount: 1,
            errorCount: 0,
            warnings: ['Configuration Test Bot 1 already exists, skipping'],
            errors: [],
          },
        }),
      });
    });

    // Mock validate API
    await page.route('/api/import-export/validate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Validation successful',
          data: {
            importedCount: 3,
            errorCount: 0,
            errors: [],
          },
        }),
      });
    });
  });

  test('Capture Import/Export Page Screenshot', async ({ page }) => {
    // Setup authentication and error detection
    await setupTestWithErrorDetection(page);

    // Navigate to Import/Export page
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Import/Export Configurations")', { timeout: 10000 });

    // Wait for cards to appear
    await page.waitForSelector('.card:has-text("Export Configurations")', { timeout: 5000 });
    await page.waitForSelector('.card:has-text("Import Configurations")', { timeout: 5000 });

    // Screenshot the main page
    await page.screenshot({ path: 'docs/screenshots/import-export-page.png', fullPage: true });

    // Verify main elements are visible
    await expect(page.locator('h1:has-text("Import/Export Configurations")')).toBeVisible();
    await expect(page.locator('.card:has-text("Export Configurations")')).toBeVisible();
    await expect(page.locator('.card:has-text("Import Configurations")')).toBeVisible();
  });

  test('Test Export Flow with Format Selection', async ({ page }) => {
    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for export card
    await page.waitForSelector('.card:has-text("Export Configurations")', { timeout: 5000 });

    // Test format selection
    const formatSelect = page.locator('select').first();
    await formatSelect.selectOption('json');
    await expect(formatSelect).toHaveValue('json');

    await formatSelect.selectOption('yaml');
    await expect(formatSelect).toHaveValue('yaml');

    await formatSelect.selectOption('csv');
    await expect(formatSelect).toHaveValue('csv');

    // Reset to JSON
    await formatSelect.selectOption('json');

    // Test checkboxes
    const includeVersionsCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(includeVersionsCheckbox).toBeChecked();

    // Click to uncheck
    await includeVersionsCheckbox.click();
    await expect(includeVersionsCheckbox).not.toBeChecked();

    // Click to check again
    await includeVersionsCheckbox.click();
    await expect(includeVersionsCheckbox).toBeChecked();

    // Open bot selection modal
    const exportButton = page.locator('button:has-text("Select Configurations to Export")');
    await exportButton.click();

    // Wait for modal
    await page.waitForSelector('text=Select Configurations to Export', { timeout: 5000 });

    // Verify bots are listed
    await expect(page.locator('text=Test Bot 1')).toBeVisible();
    await expect(page.locator('text=Test Bot 2')).toBeVisible();
    await expect(page.locator('text=Test Bot 3')).toBeVisible();

    // Select all bots
    const selectAllButton = page.locator('button:has-text("Select All")');
    await selectAllButton.click();

    // Verify checkboxes are checked
    const checkboxes = page.locator('.modal input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Click export button in modal
    const modalExportButton = page.locator('.modal button:has-text("Export")');
    await modalExportButton.click();

    // Wait for success (mock will return immediately)
    await page.waitForTimeout(1000);
  });

  test('Test Import Flow with File Upload', async ({ page }) => {
    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for import card
    await page.waitForSelector('.card:has-text("Import Configurations")', { timeout: 5000 });

    // Create a temporary test file
    const testFilePath = path.join(process.cwd(), 'test-config.json');
    const testConfig = {
      metadata: {
        id: 'test-export',
        name: 'Test Export',
        createdAt: new Date().toISOString(),
        configCount: 2,
      },
      configurations: [
        {
          id: 1,
          name: 'Test Bot 1',
          messageProvider: 'discord',
          llmProvider: 'openai',
        },
        {
          id: 2,
          name: 'Test Bot 2',
          messageProvider: 'slack',
          llmProvider: 'anthropic',
        },
      ],
    };
    fs.writeFileSync(testFilePath, JSON.stringify(testConfig, null, 2));

    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);

      // Wait for file to be selected
      await page.waitForSelector('text=test-config.json', { timeout: 5000 });

      // Verify file info is displayed
      await expect(page.locator('text=test-config.json')).toBeVisible();

      // Test validate button
      const validateButton = page.locator('button:has-text("Validate")');
      await validateButton.click();

      // Wait for validation result
      await page.waitForTimeout(1000);

      // Test import options modal
      const importOptionsButton = page.locator('button:has-text("Import Options")');
      await importOptionsButton.click();

      // Wait for modal
      await page.waitForSelector('text=Import Options', { timeout: 5000 });

      // Test checkboxes in modal
      const overwriteCheckbox = page.locator('.modal input[type="checkbox"]').first();
      await overwriteCheckbox.click();

      // Close modal
      const saveOptionsButton = page.locator('.modal button:has-text("Save Options")');
      await saveOptionsButton.click();

      // Click import button
      const importButton = page.locator('button:has-text("Import")').last();
      await importButton.click();

      // Wait for import to complete
      await page.waitForTimeout(1000);

      // Verify import results are shown
      await expect(page.locator('text=Import Results')).toBeVisible();
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('Test Encryption Options', async ({ page }) => {
    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for export card
    await page.waitForSelector('.card:has-text("Export Configurations")', { timeout: 5000 });

    // Find and click encrypt checkbox
    const encryptCheckbox = page.locator('input[type="checkbox"]').nth(4); // Encrypt is 5th checkbox
    await encryptCheckbox.click();

    // Wait for encryption key input to appear
    await page.waitForSelector('input[type="password"]', { timeout: 2000 });

    // Verify encryption key input is visible
    const encryptionKeyInput = page.locator('input[type="password"]').first();
    await expect(encryptionKeyInput).toBeVisible();
    await expect(encryptionKeyInput).toHaveAttribute('placeholder', /encryption key/i);

    // Type encryption key
    await encryptionKeyInput.fill('test-encryption-key-123');

    // Verify value is set
    await expect(encryptionKeyInput).toHaveValue('test-encryption-key-123');
  });

  test('Test Compression Option', async ({ page }) => {
    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for export card
    await page.waitForSelector('.card:has-text("Export Configurations")', { timeout: 5000 });

    // Find compress checkbox (4th checkbox)
    const compressCheckbox = page.locator('input[type="checkbox"]').nth(3);
    await expect(compressCheckbox).toBeChecked(); // Should be checked by default

    // Uncheck it
    await compressCheckbox.click();
    await expect(compressCheckbox).not.toBeChecked();

    // Check it again
    await compressCheckbox.click();
    await expect(compressCheckbox).toBeChecked();
  });

  test('Test Empty State - No Configurations', async ({ page }) => {
    // Override bots API to return empty array
    await page.route('/api/bots', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await setupTestWithErrorDetection(page);
    await navigateAndWaitReady(page, '/admin/import-export');

    // Wait for export card
    await page.waitForSelector('.card:has-text("Export Configurations")', { timeout: 5000 });

    // Open bot selection modal
    const exportButton = page.locator('button:has-text("Select Configurations to Export")');
    await exportButton.click();

    // Wait for modal
    await page.waitForSelector('text=Select Configurations to Export', { timeout: 5000 });

    // Verify empty state message
    await expect(page.locator('text=No configurations available to export')).toBeVisible();
  });
});
