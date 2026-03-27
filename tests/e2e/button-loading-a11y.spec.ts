import { expect, test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('AIAssistButton Loading State Accessibility', async ({ page }) => {
  await setupAuth(page);
  // Go to the bot create page where AIAssistButton is used
  await page.goto('/admin/bots/create');

  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Wait for the buttons to load (wait for the page loading spinner to go away)
  // Actually, wait for any AIAssistButton. Wait for its label.
  const button = page.locator('button[aria-label="Generate Name"]');
  await button.waitFor({ state: 'visible' });

  // Wait for 1 second to ensure the loading state persists for screenshot
  await page.screenshot({ path: 'docs/screenshots/ai-assist-button-before.png' });

  // We mock the API call so it hangs forever so we can inspect the loading state
  await page.route('/api/ai-assist/generate', (route) => {
    // Just don't fulfill it
  });

  // Click the button to set it into loading state
  await button.click();

  // Wait a bit for state to update
  await page.waitForTimeout(500);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/ai-assist-button-after.png' });

  // Wait for 1 second just in case
  await page.waitForTimeout(1000);

  // Since button might be disabled, let's just grab the attributes from any button that is disabled
  const disabledButton = page.locator('button[disabled]');
  const ariaLabel = await disabledButton.first().getAttribute('aria-label');
  const ariaBusy = await disabledButton.first().getAttribute('aria-busy');

  console.log('--- After Click (Loading) ---');
  console.log('aria-label:', ariaLabel);
  console.log('aria-busy:', ariaBusy);
});
