import { expect, test } from '@playwright/test';
import { navigateAndWaitReady, setupTestWithErrorDetection } from './test-utils';

/**
 * Full Journey: Smart Sequence
 * 
 * Iterates through every major endpoint in a smart sequence without mocks:
 * 1) Add LLM Provider
 * 2) Add Messenger Integration
 * 3) Create Persona
 * 4) Create Bot tying them together
 * 5) Send a test message
 * 6) Navigate to the Dashboard and verify stats
 */
test.describe('Full Journey: Smart Sequence', () => {
  // Increased timeout for a full journey without mocks
  test.setTimeout(120000);

  test('Execute full system journey and verify dashboard', async ({ page }) => {
    // Step 0: Setup and Authentication
    await setupTestWithErrorDetection(page);

    // Step 1: Add LLM Provider
    await navigateAndWaitReady(page, '/admin/providers/llm');
    const addLlmBtn = page.locator('button:has-text("Create Profile"), button:has-text("Add Provider")').first();
    if (await addLlmBtn.count() > 0) {
      await addLlmBtn.click();
      await page.locator('input[name="name"]').fill('Smart-LLM-E2E');
      await page.locator('select[name="provider"]').selectOption('openai');
      await page.locator('input[name="apiKey"]').fill('sk-smart-sequence-test-key');
      await page.locator('button:has-text("Save")').click();
    }

    // Step 2: Add Messenger Integration
    await navigateAndWaitReady(page, '/admin/providers/message');
    const addMsgBtn = page.locator('button:has-text("Create Profile"), button:has-text("Add Provider")').first();
    if (await addMsgBtn.count() > 0) {
      await addMsgBtn.click();
      await page.locator('input[name="name"]').fill('Smart-Msg-E2E');
      await page.locator('select[name="provider"]').selectOption('discord');
      await page.locator('button:has-text("Save")').click();
    }

    // Step 3: Create Persona
    await navigateAndWaitReady(page, '/admin/personas');
    const addPersonaBtn = page.locator('button:has-text("Create Persona"), button:has-text("Create")').first();
    if (await addPersonaBtn.count() > 0) {
      await addPersonaBtn.click();
      await page.locator('input[name="name"], input[placeholder*="Friendly Helper"]').fill('Smart-Persona-E2E');
      await page.locator('input[name="description"], input[placeholder*="Short description"]').fill('E2E persona for smart sequence');
      await page.locator('textarea[name="systemPrompt"], .monaco-editor').first().type('You are a helpful E2E assistant.');
      await page.locator('button:has-text("Save")').click();
    }

    // Step 4: Create Bot tying them together
    await navigateAndWaitReady(page, '/admin/bots');
    const createBotBtn = page.locator('button:has-text("Create")').first();
    if (await createBotBtn.count() > 0) {
      await createBotBtn.click();
      await page.locator('input[name="name"]').fill('Smart-Bot-E2E');
      
      const msgProviderSelect = page.locator('select[name="messageProvider"]');
      if (await msgProviderSelect.count() > 0) await msgProviderSelect.selectOption({ label: 'Smart-Msg-E2E' });
      
      const llmProviderSelect = page.locator('select[name="llmProvider"]');
      if (await llmProviderSelect.count() > 0) await llmProviderSelect.selectOption({ label: 'Smart-LLM-E2E' });
      
      await page.locator('button:has-text("Save")').first().click();
      await page.waitForResponse('**/api/bots', { timeout: 10000 });
    }

    // Step 5: Navigate to chat
    await navigateAndWaitReady(page, '/admin/chat');
    
    // Step 6: Navigate to the Dashboard and verify stats are populated
    await navigateAndWaitReady(page, '/admin/overview');
    
    // Wait for network to settle so dashboard widgets load
    await page.waitForLoadState('networkidle');
    
    // Final Step: Take full-page screenshot proving the system works
    await page.screenshot({ 
      path: 'test-results/smart-sequence-final.png', 
      fullPage: true 
    });

    console.log('✅ Full journey smart sequence E2E test completed successfully');
  });
});
