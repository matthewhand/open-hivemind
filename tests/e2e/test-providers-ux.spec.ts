import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('verify Providers Pages UX', async ({ page }) => {
  await setupAuth(page);

  // Mock global config for LLM
  await page.route('/api/config/global', async (route) => route.fulfill({ status: 200, json: { _userSettings: { values: { perUseCaseEnabled: false } }, llm: { values: {} } } }));
  await page.route('/api/config/llm-status', async (route) => route.fulfill({ status: 200, json: { configured: true, providers: [{ id: 'sys', type: 'openai', name: 'OpenAI (System)' }], libraryStatus: {} } }));

  // Mock profiles
  await page.route('/api/config/llm-profiles', async (route) => route.fulfill({ status: 200, json: {
    llm: [
      { key: 'my-gpt4', name: 'My GPT-4', provider: 'openai', modelType: 'chat', config: { apiKey: 'sk-123' } }
    ]
  }}));

  await page.route('/api/config/message-profiles', async (route) => route.fulfill({ status: 200, json: {
    profiles: { message: [
      { key: 'my-discord', name: 'My Discord Bot', provider: 'discord', config: { token: 'discord-token-123' } }
    ]}
  }}));

  // Visit LLM Providers
  await page.goto('/providers/llm');
  await expect(page.locator('text=LLM Providers')).toBeVisible();
  // Wait for network/rendering
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.jules/before-llm-providers.png', fullPage: true });

  // Visit Message Providers
  await page.goto('/providers/message');
  await expect(page.locator('text=Message Providers')).toBeVisible();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '.jules/before-message-providers.png', fullPage: true });
});
