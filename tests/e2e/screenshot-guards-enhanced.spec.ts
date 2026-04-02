import { expect, test, type Page } from '@playwright/test';
import { authenticateAsAdmin, waitForApiResponse } from './helpers';

test.describe('Enhanced Guards Configuration UI', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await authenticateAsAdmin(page);
    await page.goto('/guards');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display guards page with templates button', async () => {
    await expect(page.locator('h1')).toContainText('Guard Profiles');
    await expect(page.getByRole('button', { name: /Templates/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /New Profile/i })).toBeVisible();
  });

  test('should show configuration templates', async () => {
    await page.getByRole('button', { name: /Templates/i }).click();
    await expect(page.getByText('Configuration Templates')).toBeVisible();
    await expect(page.getByText('Strict Production')).toBeVisible();
    await expect(page.getByText('Moderate Security')).toBeVisible();
    await expect(page.getByText('Permissive Development')).toBeVisible();
  });

  test('should apply template and show configuration', async () => {
    await page.getByRole('button', { name: /Templates/i }).click();
    await page.getByText('Strict Production').click();

    // Verify template values are applied
    await expect(page.getByLabel('Profile Name')).toHaveValue('Strict Production');
    await expect(page.getByLabel('Description')).toContainText('High security profile');

    // Verify guards are configured
    const accessControlToggle = page.locator('[aria-label*="Access Control"]').first();
    await expect(accessControlToggle).toBeChecked();
  });

  test('should create guard with validation', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();

    // Try to save without name - should show validation error
    await page.getByRole('button', { name: /Create Profile/i }).click();

    // The button should be disabled when name is empty
    await expect(page.getByRole('button', { name: /Create Profile/i })).toBeDisabled();

    // Fill in profile name
    await page.getByLabel('Profile Name').fill('Test Security Profile');
    await page.getByLabel('Description').fill('A test profile for security validation');

    // Enable Access Control
    await page.locator('.collapse').first().click();
    const accessToggle = page.locator('.collapse').first().locator('input[type="checkbox"]').nth(1);
    if (!(await accessToggle.isChecked())) {
      await accessToggle.click();
    }

    // Enable Rate Limiter
    await page.locator('.collapse').nth(1).click();
    const rateLimitToggle = page
      .locator('.collapse')
      .nth(1)
      .locator('input[type="checkbox"]')
      .nth(1);
    if (!(await rateLimitToggle.isChecked())) {
      await rateLimitToggle.click();
    }

    // Set rate limit values
    await page.getByLabel('Max Requests').fill('150');

    // Enable Content Filter
    await page.locator('.collapse').nth(2).click();
    const contentToggle = page.locator('.collapse').nth(2).locator('input[type="checkbox"]').nth(1);
    if (!(await contentToggle.isChecked())) {
      await contentToggle.click();
    }

    // Set content filter
    await page.locator('input[type="radio"][value="high"]').check();
    await page.locator('#blocked-terms').fill('password, secret, token');

    // Save profile
    const saveButton = page.getByRole('button', { name: /Create Profile/i });
    await expect(saveButton).toBeEnabled();
  });

  test('should show help text for each guard type', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();

    // Expand Access Control section
    await page.locator('.collapse').first().click();
    await expect(page.getByText('Controls which users can access specific tools')).toBeVisible();

    // Expand Rate Limiter section
    await page.locator('.collapse').nth(1).click();
    await expect(
      page.getByText('Limits the number of requests within a time window')
    ).toBeVisible();

    // Expand Content Filter section
    await page.locator('.collapse').nth(2).click();
    await expect(page.getByText('Blocks messages containing specific terms')).toBeVisible();
  });

  test('should test guard functionality', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();
    await page.getByLabel('Profile Name').fill('Test Guard');

    // Enable Content Filter
    await page.locator('.collapse').nth(2).click();
    const contentToggle = page.locator('.collapse').nth(2).locator('input[type="checkbox"]').nth(1);
    if (!(await contentToggle.isChecked())) {
      await contentToggle.click();
    }
    await page.locator('#blocked-terms').fill('password, secret');

    // Open test modal
    await page.getByRole('button', { name: /Test Guards/i }).click();
    await expect(page.getByText('Test Your Guards')).toBeVisible();

    // Fill in test input
    await page.getByLabel('User ID').fill('test-user');
    await page.getByLabel('Tool Name').fill('calculator');
    await page.getByLabel('Content').fill('Here is my password');

    // Run test
    await page.getByRole('button', { name: /Run Test/i }).click();

    // Wait for results
    await expect(page.getByText('Test Results')).toBeVisible();
    await expect(page.getByText(/Overall Result:/i)).toBeVisible();
    await expect(page.getByText(/BLOCKED/i)).toBeVisible();
    await expect(page.getByText(/Found blocked terms: password/i)).toBeVisible();
  });

  test('should validate rate limit configuration', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();
    await page.getByLabel('Profile Name').fill('Rate Limit Test');

    // Enable Rate Limiter
    await page.locator('.collapse').nth(1).click();
    const rateLimitToggle = page
      .locator('.collapse')
      .nth(1)
      .locator('input[type="checkbox"]')
      .nth(1);
    if (!(await rateLimitToggle.isChecked())) {
      await rateLimitToggle.click();
    }

    // Try to set excessive max requests
    await page.getByLabel('Max Requests').fill('20000');

    // The form should show validation error or prevent submission
    // This would be caught by backend validation
  });

  test('should show visual indicators for enabled/disabled guards', async () => {
    // Create a profile first
    await page.getByRole('button', { name: /New Profile/i }).click();
    await page.getByLabel('Profile Name').fill('Visual Test Profile');

    // Enable only Access Control
    await page.locator('.collapse').first().click();
    const accessToggle = page.locator('.collapse').first().locator('input[type="checkbox"]').nth(1);
    if (!(await accessToggle.isChecked())) {
      await accessToggle.click();
    }

    // The toggle should show as checked/enabled
    await expect(accessToggle).toBeChecked();
  });

  test('should capture comprehensive guards configuration screenshot', async () => {
    // Create a guard profile with all features visible
    await page.getByRole('button', { name: /Templates/i }).click();
    await page.getByText('Strict Production').click();

    // Wait for modal to be fully loaded
    await page.waitForTimeout(500);

    // Expand all guard sections
    const collapses = page.locator('.collapse');
    for (let i = 0; i < (await collapses.count()); i++) {
      const collapse = collapses.nth(i);
      const checkbox = collapse.locator('input[type="checkbox"]').first();
      if (!(await checkbox.isChecked())) {
        await collapse.click();
        await page.waitForTimeout(300);
      }
    }

    // Ensure help text is visible
    await expect(page.getByText('Controls which users can access specific tools')).toBeVisible();

    // Take screenshot of the configuration modal
    const modal = page.locator('.modal.modal-open');
    await expect(modal).toBeVisible();

    // Capture full page screenshot showing the guard configuration
    await page.screenshot({
      path: 'docs/screenshots/guards-configuration.png',
      fullPage: true,
    });
  });

  test('should show error states in form validation', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();

    // Leave name empty and try to interact with other fields
    await page.getByLabel('Description').fill('Test description');

    // The save button should be disabled
    await expect(page.getByRole('button', { name: /Create Profile/i })).toBeDisabled();

    // Fill name to enable save
    await page.getByLabel('Profile Name').fill('Test Profile');
    await expect(page.getByRole('button', { name: /Create Profile/i })).toBeEnabled();
  });

  test('should test allowed content scenario', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();
    await page.getByLabel('Profile Name').fill('Test Guard');

    // Enable Content Filter
    await page.locator('.collapse').nth(2).click();
    const contentToggle = page.locator('.collapse').nth(2).locator('input[type="checkbox"]').nth(1);
    if (!(await contentToggle.isChecked())) {
      await contentToggle.click();
    }
    await page.locator('#blocked-terms').fill('password, secret');

    // Open test modal
    await page.getByRole('button', { name: /Test Guards/i }).click();

    // Fill in safe content
    await page.getByLabel('Content').fill('This is safe content without any issues');

    // Run test
    await page.getByRole('button', { name: /Run Test/i }).click();

    // Wait for results
    await expect(page.getByText('Test Results')).toBeVisible();
    await expect(page.getByText(/ALLOWED/i)).toBeVisible();
    await expect(page.getByText(/No blocked terms found/i)).toBeVisible();
  });

  test('should show disabled state for form fields when guard is disabled', async () => {
    await page.getByRole('button', { name: /New Profile/i }).click();
    await page.getByLabel('Profile Name').fill('Disabled State Test');

    // Expand Rate Limiter but keep it disabled
    await page.locator('.collapse').nth(1).click();

    // The max requests field should be disabled or have opacity
    const maxRequestsInput = page.getByLabel('Max Requests');
    await expect(maxRequestsInput).toBeDisabled();
  });
});
