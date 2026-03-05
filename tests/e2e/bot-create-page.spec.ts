import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';
import { CONFIG_LIMITS } from '../../src/types/config';

test.describe('Bot Create Page (Standalone)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);

    // Mock API responses
    await page.route('/api/auth/check', async (route) => {
      await route.fulfill({ status: 200, json: { authenticated: true, user: { role: 'admin' } } });
    });

    await page.route('/api/health/detailed', async (route) =>
      route.fulfill({ status: 200, json: { status: 'ok' } })
    );

    await page.route('/api/config/llm-status', async (route) =>
      route.fulfill({
        status: 200,
        json: { defaultConfigured: true, defaultProviders: [{ name: 'System Default GPT' }] },
      })
    );

    await page.route('/api/personas', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'friendly-helper', name: 'Friendly Helper', description: 'A polite assistant.' },
          { id: 'coder', name: 'Coder', description: 'Writes code.' },
        ]),
      });
    });

    await page.route('/api/config/llm-profiles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profiles: {
            llm: [{ key: 'gpt-4', name: 'GPT-4', provider: 'openai' }],
          },
        }),
      });
    });

    await page.route('/api/admin/mcp-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'server-1', name: 'File System Server', description: 'Reads local files' },
            { id: 'server-2', name: 'GitHub Server', description: 'Interacts with GitHub API' },
          ],
        }),
      });
    });
  });

  test('should verify platform selection grid and persona preview', async ({ page }) => {
    await page.goto('/admin/bots/create');

    // 1. Verify Platform Grid
    const discordCard = page.getByText('Discord');
    const slackCard = page.getByText('Slack');

    await expect(discordCard).toBeVisible();
    await expect(slackCard).toBeVisible();

    // Initial state: Discord should be selected (default in code? Let's check)
    // Actually in my code: const [formData, setFormData] = useState({ ... platform: 'discord' ... });
    // So Discord should be selected.

    // Check if Discord card has selected styling (border-primary)
    // We can check class
    const discordParent = discordCard.locator('..');
    await expect(discordParent).toHaveClass(/bg-primary\/5/);

    // Click Slack
    await slackCard.click();

    // Verify Slack is selected
    const slackParent = slackCard.locator('..');
    await expect(slackParent).toHaveClass(/bg-primary\/5/);
    await expect(discordParent).not.toHaveClass(/bg-primary\/5/);

    // 2. Verify Persona Preview
    const personaSelect = page.getByRole('combobox').nth(0); // First select is Persona?
    // Wait, let's check order.
    // Grid is Platform (divs).
    // Then Persona (Select).
    // Then LLM (Select).

    // Select 'Friendly Helper'
    await personaSelect.selectOption('friendly-helper');

    // Verify preview card appears
    await expect(page.getByText('A polite assistant.')).toBeVisible();

    // 3. Verify LLM Default Info
    // Default is "Use System Default"
    // Should see "Using system default configuration"
    await expect(page.getByText('Using system default configuration')).toBeVisible();

    // 4. Verify Form Submission enablement
    // Name is empty, button should be disabled
    const submitBtn = page.getByRole('button', { name: 'Create Bot' });
    await expect(submitBtn).toBeDisabled();

    // Fill Name
    await page.getByPlaceholder('e.g. HelpBot').fill('My New Bot');

    // Button should be enabled (Platform is set, LLM is default valid)
    await expect(submitBtn).toBeEnabled();

    // 5. Verify text lengths use CONFIG_LIMITS
    const systemInstructionInput = page.getByPlaceholder('e.g., You are a helpful and concise assistant.');
    await systemInstructionInput.fill('short');
    await expect(page.getByText('System instruction is very short. Consider providing more detail.')).toBeVisible();

    const longInstruction = 'a'.repeat(CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH + 1);
    await systemInstructionInput.fill(longInstruction);
    await expect(page.getByText(`System instruction is very long (max ${CONFIG_LIMITS.SYSTEM_INSTRUCTION_WARNING_LENGTH} chars recommended).`)).toBeVisible();
  });
});
