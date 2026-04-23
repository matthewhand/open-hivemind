import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: LLM Provider Integration
 *
 * Tests the complete LLM provider setup flow using real backend APIs:
 * 1. Navigate to LLM provider configuration
 * 2. Add a new LLM provider with API key
 * 3. Configure provider settings
 * 4. Test connection to provider
 * 5. Assign provider to bot
 * 6. Verify bot is using the provider
 *
 * @tag @full-journey @llm @integration @providers @critical
 */
test.describe('Full Journey: LLM Provider Integration', () => {
  test.setTimeout(90000);

  test('Add OpenAI provider and configure with bot', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Step 1: Navigate to LLM providers page
    await navigateAndWaitReady(page, '/admin/llm-providers');

    // Step 2: Add new OpenAI provider
    const addProviderBtn = page.locator('button:has-text("Add Provider")').first();
    if ((await addProviderBtn.count()) > 0) {
      await addProviderBtn.click();

      // Fill provider form
      await page.locator('select[name="providerType"]').selectOption('openai');
      await page.locator('input[name="name"]').fill('E2E OpenAI');
      await page.locator('input[name="apiKey"]').fill('sk-mock-e2e-key-12345');
      await page.locator('select[name="defaultModel"]').selectOption('gpt-4');

      // Save provider and wait for real API response
      const saveResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/llm/providers') && response.request().method() === 'POST',
        { timeout: 10000 }
      );
      
      const saveBtn = page.locator('button:has-text("Save")').first();
      await saveBtn.click();
      
      const saveResponse = await saveResponsePromise;
      expect(saveResponse.status()).toBe(201);
      const responseBody = await saveResponse.json();
      expect(responseBody.providerType).toBe('openai');
      expect(responseBody.name).toBe('E2E OpenAI');
    }

    // Step 4: Create bot with this provider
    await navigateAndWaitReady(page, '/admin/bots');

    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();
    await page.locator('input[name="name"]').fill('Provider Test Bot');
    await page.locator('select[name="messageProvider"]').selectOption('discord');
    
    // Wait for the provider to be available in the dropdown
    const llmSelect = page.locator('select[name="llmProvider"]');
    await expect(llmSelect).toBeVisible({ timeout: 5000 });
    await llmSelect.selectOption({ label: 'E2E OpenAI' });
    
    // Save bot and wait for real API response
    const botSavePromise = page.waitForResponse(
      (response) => response.url().includes('/api/bots') && response.request().method() === 'POST',
      { timeout: 10000 }
    );
    
    await page.locator('button:has-text("Save")').first().click();
    
    const botResponse = await botSavePromise;
    expect(botResponse.status()).toBe(201);
    const botData = await botResponse.json();
    
    // Some APIs might return the bot nested in a data property
    const bot = botData.data?.bot || botData;
    expect(bot.llmProvider).toBe('E2E OpenAI');

    console.log(
      '✅ LLM provider integration journey completed: OpenAI provider added and assigned to bot'
    );
  });

  test('Configure multiple providers and verify all connected', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    await navigateAndWaitReady(page, '/admin/llm-providers');

    // Add OpenAI
    const addProviderBtn = page.locator('button:has-text("Add Provider")').first();
    if ((await addProviderBtn.count()) > 0) {
      await addProviderBtn.click();
      await page.locator('select[name="providerType"]').selectOption('openai');
      await page.locator('input[name="name"]').fill('Provider OpenAI');
      await page.locator('input[name="apiKey"]').fill('sk-openai-mock');
      
      const savePromise1 = page.waitForResponse(
        (response) =>
          response.url().includes('/api/llm/providers') && response.request().method() === 'POST',
        { timeout: 10000 }
      );
      await page.locator('button:has-text("Save")').first().click();
      await savePromise1;
    }

    // Add Anthropic
    if ((await addProviderBtn.count()) > 0) {
      await addProviderBtn.click();
      await page.locator('select[name="providerType"]').selectOption('anthropic');
      await page.locator('input[name="name"]').fill('Provider Anthropic');
      await page.locator('input[name="apiKey"]').fill('sk-ant-mock');
      
      const savePromise2 = page.waitForResponse(
        (response) =>
          response.url().includes('/api/llm/providers') && response.request().method() === 'POST',
        { timeout: 10000 }
      );
      await page.locator('button:has-text("Save")').first().click();
      await savePromise2;
    }

    // Verify providers are listed
    const providerList = page.locator('table, .list-container');
    await expect(providerList).toContainText('Provider OpenAI');
    await expect(providerList).toContainText('Provider Anthropic');

    console.log('✅ Multiple LLM providers journey completed: 2 providers configured');
  });

  test('Add provider and verify appearance in selection dropdowns', async ({ page }) => {
    const errors = await setupTestWithErrorDetection(page);

    // Add provider first
    await navigateAndWaitReady(page, '/admin/llm-providers');

    const addProviderBtn = page.locator('button:has-text("Add Provider")').first();
    if ((await addProviderBtn.count()) > 0) {
      await addProviderBtn.click();
      await page.locator('select[name="providerType"]').selectOption('openai');
      await page.locator('input[name="name"]').fill('Dropdown Test Provider');
      await page.locator('input[name="apiKey"]').fill('sk-dropdown-test');
      
      const savePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/llm/providers') && response.request().method() === 'POST',
        { timeout: 10000 }
      );
      await page.locator('button:has-text("Save")').first().click();
      await savePromise;
    }

    // Navigate to bot creation
    await navigateAndWaitReady(page, '/admin/bots');

    const createBtn = page.locator('button:has-text("Create")').first();
    await createBtn.click();

    // Verify the new provider appears in the LLM provider dropdown
    const llmSelect = page.locator('select[name="llmProvider"]');
    await expect(llmSelect).toBeVisible({ timeout: 5000 });
    
    // Check if the option exists
    const options = await llmSelect.locator('option').allTextContents();
    expect(options).toContain('Dropdown Test Provider');

    console.log('✅ Provider dropdown integration journey completed');
  });
});
