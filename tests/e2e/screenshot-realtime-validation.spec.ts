import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test.describe('Real-Time Validation Screenshot', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication
    await setupAuth(page);

    // Mock authentication
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    // Mock background polling endpoints
    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    // Mock LLM Status
    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: {
          defaultConfigured: false, // Force LLM provider to be required
          defaultProviders: [],
          botsMissingLlmProvider: [],
          hasMissing: false,
        },
      })
    );

    await page.route('/api/config/global', async (route) =>
      route.fulfill({ status: 200, json: {} })
    );

    // Mock LLM Profiles
    await page.route('/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          llm: [
            {
              key: 'gpt-4-turbo',
              name: 'GPT-4 Turbo',
              provider: 'openai',
            },
            {
              key: 'claude-3-opus',
              name: 'Claude 3 Opus',
              provider: 'anthropic',
            },
          ],
        },
      });
    });

    // Mock Personas
    await page.route('/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'friendly-helper',
            name: 'Friendly Helper',
            description: 'A polite and helpful assistant.',
          },
        ],
      });
    });

    await page.route('/api/admin/guard-profiles', async (route) =>
      route.fulfill({ status: 200, json: [] })
    );
    await page.route('/api/csrf-token', async (route) =>
      route.fulfill({ status: 200, json: { csrfToken: 'mock-token' } })
    );

    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({ status: 200, json: { data: [] } });
    });

    // Mock existing bots
    await page.route('/api/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            data: {
              bots: [
                {
                  id: '1',
                  name: 'existing-bot',
                  status: 'active',
                  messageProvider: 'discord',
                  llmProvider: 'openai',
                },
              ],
            },
          },
        });
      } else {
        // Handle POST
        await route.fulfill({ status: 201, json: { success: true } });
      }
    });
  });

  test('capture real-time validation states', async ({ page }) => {
    // Track validation requests
    let validationCallCount = 0;
    const validationResponses = new Map<number, any>();

    // Set viewport for consistent screenshot
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to Bots page
    await page.goto('/admin/bots');
    await expect(page.getByText('AI Swarm Management')).toBeVisible();

    // Open create bot modal
    await page.getByRole('button', { name: /create new bot/i }).click();
    await expect(page.getByText('Create New Bot')).toBeVisible();

    // Step 1: Show validation errors (empty form)
    // Mock validation endpoint to return errors
    await page.route('/api/admin/validate/bot-config', async (route) => {
      validationCallCount++;
      const requestBody = route.request().postDataJSON();
      const configData = requestBody.configData;

      let response: any = {
        success: true,
        result: {
          isValid: true,
          errors: [],
          warnings: [],
          score: 100,
        },
      };

      // Validation rules based on input
      if (!configData.name || configData.name.trim() === '') {
        response.result.isValid = false;
        response.result.errors.push({
          id: 'req-name-1',
          ruleId: 'required-name',
          message: 'Bot name is required',
          field: 'name',
          value: configData.name,
          suggestions: ['Provide a unique name for your bot configuration'],
          category: 'required',
        });
        response.result.score = 0;
      }

      // Check name format
      if (configData.name && !/^[a-zA-Z0-9_-]{1,100}$/.test(configData.name)) {
        response.result.isValid = false;
        response.result.errors.push({
          id: 'fmt-name-1',
          ruleId: 'format-bot-name',
          message:
            'Bot name must be 1-100 characters and contain only letters, numbers, underscores, and hyphens',
          field: 'name',
          value: configData.name,
          expected: '^[a-zA-Z0-9_-]{1,100}$',
          suggestions: ['Use only alphanumeric characters, underscores, and hyphens'],
          category: 'format',
        });
        response.result.score = 0;
      }

      // Check for duplicate name
      if (configData.name === 'existing-bot') {
        response.result.isValid = false;
        response.result.errors.push({
          id: 'biz-name-1',
          ruleId: 'business-unique-name',
          message: 'Bot name "existing-bot" must be unique',
          field: 'name',
          value: configData.name,
          suggestions: ['Consider using "existing-bot-2" or a different name'],
          category: 'business',
        });
        response.result.score = 0;
      }

      if (!configData.messageProvider || configData.messageProvider.trim() === '') {
        response.result.isValid = false;
        response.result.errors.push({
          id: 'req-msg-1',
          ruleId: 'required-message-provider',
          message: 'Message provider is required',
          field: 'messageProvider',
          value: configData.messageProvider,
          suggestions: ['Select a message provider: discord, slack, mattermost, or webhook'],
          category: 'required',
        });
        response.result.score = 0;
      }

      if (!configData.llmProvider || configData.llmProvider.trim() === '') {
        response.result.isValid = false;
        response.result.errors.push({
          id: 'req-llm-1',
          ruleId: 'required-llm-provider',
          message: 'LLM provider is required',
          field: 'llmProvider',
          value: configData.llmProvider,
          suggestions: ['Select an LLM provider: openai, flowise, or openwebui'],
          category: 'required',
        });
        response.result.score = 0;
      }

      // Check for hardcoded secrets (warning)
      const configStr = JSON.stringify(configData);
      if (/"apiKey":\s*"sk-[^"]+"/i.test(configStr) || /"token":\s*"[^$][^"]+"/i.test(configStr)) {
        response.result.warnings.push({
          id: 'sec-secrets-1',
          ruleId: 'security-no-hardcoded-secrets',
          message: 'Potential hardcoded secret detected in configuration',
          field: 'config',
          value: '***REDACTED***',
          suggestions: [
            'Use environment variables with ${VAR_NAME} syntax',
            'Store secrets in a secure configuration management system',
          ],
          category: 'security',
        });
        response.result.score = Math.max(0, response.result.score - 30);
      }

      validationResponses.set(validationCallCount, response);
      await route.fulfill({ status: 200, json: response });
    });

    // Type an invalid bot name (with spaces, which triggers format error)
    const nameInput = page.locator('input[placeholder*="HelpBot"]').first();
    await nameInput.fill('My Bot With Spaces!');

    // Wait for validation to trigger (debounced)
    await page.waitForTimeout(600);

    // Should see validation error
    await expect(page.getByText(/Bot name must be.*alphanumeric/i)).toBeVisible({ timeout: 2000 });

    // Take screenshot showing invalid state
    await page.screenshot({
      path: 'docs/screenshots/realtime-validation-error.png',
      fullPage: true,
    });

    // Clear and type a duplicate name
    await nameInput.fill('existing-bot');
    await page.waitForTimeout(600);

    // Should see uniqueness error
    await expect(page.getByText(/must be unique/i)).toBeVisible({ timeout: 2000 });

    // Now type a valid name
    await nameInput.fill('my-new-bot');

    // Select message provider
    const messageProviderSelect = page
      .locator('select')
      .filter({ hasText: /Select Provider/i })
      .first();
    await messageProviderSelect.selectOption('discord');

    // Select LLM provider
    const llmProviderSelect = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: /System Default/i }) })
      .first();
    await llmProviderSelect.selectOption('gpt-4-turbo');

    // Wait for validation
    await page.waitForTimeout(600);

    // Should show valid state (green checkmark or success indicator)
    // Look for valid state indicators
    const validState = page.locator('.text-success, .input-success, [class*="success"]').first();
    await expect(validState).toBeVisible({ timeout: 2000 });

    // Take screenshot showing valid state
    await page.screenshot({
      path: 'docs/screenshots/realtime-validation-valid.png',
      fullPage: true,
    });

    // Now add some config with a warning (hardcoded API key)
    // We need to add a custom field for this - let's simulate by using description with special marker
    const descriptionTextarea = page.locator('textarea').first();
    await descriptionTextarea.fill('A bot with config: {"apiKey": "sk-1234567890"}');

    // Wait for validation
    await page.waitForTimeout(600);

    // Should show warning but still be valid
    await expect(page.getByText(/hardcoded secret/i)).toBeVisible({ timeout: 2000 });

    // Take screenshot showing warning state
    await page.screenshot({
      path: 'docs/screenshots/realtime-validation-warning.png',
      fullPage: true,
    });

    // Verify debouncing worked (should have made fewer calls than keystrokes)
    expect(validationCallCount).toBeGreaterThan(0);
    expect(validationCallCount).toBeLessThan(20); // Much less than the number of individual keystrokes

    // Take final comprehensive screenshot
    await page.screenshot({ path: 'docs/screenshots/realtime-validation.png', fullPage: true });
  });

  test('capture validation feedback in form', async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Mock validation with comprehensive feedback
    await page.route('/api/admin/validate/bot-config', async (route) => {
      const requestBody = route.request().postDataJSON();
      const configData = requestBody.configData;

      const response = {
        success: true,
        result: {
          isValid: false,
          errors: [
            {
              id: 'req-name-1',
              ruleId: 'required-name',
              message: 'Bot name is required',
              field: 'name',
              value: '',
              suggestions: ['Provide a unique name for your bot configuration'],
              category: 'required',
            },
            {
              id: 'req-msg-1',
              ruleId: 'required-message-provider',
              message: 'Message provider is required',
              field: 'messageProvider',
              value: '',
              suggestions: ['Select a message provider: discord, slack, mattermost, or webhook'],
              category: 'required',
            },
          ],
          warnings: [
            {
              id: 'perf-model-1',
              ruleId: 'performance-model-selection',
              message: 'Consider performance implications of selected model',
              field: 'llmProvider',
              value: 'gpt-4',
              suggestions: ['GPT-4 is powerful but slower and more expensive'],
              category: 'performance',
            },
          ],
          score: 20,
        },
      };

      await route.fulfill({ status: 200, json: response });
    });

    // Navigate to Bots page and open create modal
    await page.goto('/admin/bots');
    await page.getByRole('button', { name: /create new bot/i }).click();
    await expect(page.getByText('Create New Bot')).toBeVisible();

    // Wait for validation to trigger on empty form
    await page.waitForTimeout(600);

    // Should see multiple validation errors
    await expect(page.getByText(/Bot name is required/i)).toBeVisible({ timeout: 2000 });

    // Take comprehensive screenshot
    await page.screenshot({
      path: 'docs/screenshots/realtime-validation-comprehensive.png',
      fullPage: true,
    });
  });
});
