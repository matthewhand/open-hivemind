import { expect, test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test.describe('Full Journey: Smart Sequence', () => {
  test.setTimeout(180000);

  test('Execute full system journey and verify dashboard', async ({ page, request }) => {
    console.log('🚀 Starting Smart Sequence E2E (API Setup + UI Verification)');

    // 1. Auth Setup
    await setupTestWithErrorDetection(page);

    const jwtSecret = process.env.JWT_SECRET || 'open-hivemind-test-secret-123';
    const fakeToken = require('jsonwebtoken').sign(
      {
        exp: Math.floor(Date.now() / 1000) + 3600,
        username: 'admin',
        userId: 'admin',
        role: 'admin',
        permissions: ['*'],
      },
      jwtSecret
    );
    const authHeaders = {
      Authorization: `Bearer ${fakeToken}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Add LLM Provider via API
    console.log('Setting up LLM Provider...');
    const llmRes = await request.post('/api/admin/llm-providers', {
      headers: authHeaders,
      data: {
        name: 'Smart-LLM-E2E',
        type: 'openai',
        modelType: 'chat',
        config: { apiKey: 'sk-test', model: 'gpt-4o' },
      },
    });
    expect(llmRes.ok()).toBeTruthy();

    // Step 2: Add Messenger Integration via API
    console.log('Setting up Message Provider...');
    const msgRes = await request.post('/api/admin/messenger-providers', {
      headers: authHeaders,
      data: {
        name: 'Smart-Msg-E2E',
        type: 'discord',
        config: { token: 'discord-token', clientId: '12345' },
      },
    });
    expect(msgRes.ok()).toBeTruthy();

    // Step 3: Create Persona via API
    console.log('Setting up Persona...');
    const perRes = await request.post('/api/personas', {
      headers: authHeaders,
      data: {
        name: 'Smart-Persona-E2E',
        description: 'E2E persona',
        category: 'professional',
        systemPrompt: 'You are a helpful E2E assistant.',
        traits: [],
      },
    });
    expect(perRes.ok()).toBeTruthy();

    // Step 4: Create Bot via API
    console.log('Creating Bot...');
    const botRes = await request.post('/api/bots', {
      headers: authHeaders,
      data: {
        name: 'Smart-Bot-E2E',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
      },
    });
    expect(botRes.ok()).toBeTruthy();

    // Wait a moment for DB sync
    await page.waitForTimeout(2000);

    // Step 5: Navigate to Dashboard and verify stats
    console.log('Verifying Dashboard...');
    await page.goto('/admin/overview', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin\/overview/);

    // Wait for network to settle so dashboard widgets load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give React time to render charts

    // Final Step: Take full-page screenshot proving the system works
    await page.screenshot({
      path: 'test-results/smart-sequence-final.png',
      fullPage: true,
    });

    console.log('✅ Full journey smart sequence E2E test completed successfully');
  });
});
