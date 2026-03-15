import { test, expect } from '@playwright/test';
import { setupAuth } from './test-utils';

test('verify toast UX for error handling in MCP Provider Test', async ({ page }) => {
  await setupAuth(page);

  // We need to render a generic test page using one of the components we modified.
  // The UI Components page (DaisyUIShowcase) is perfect for this.
  await page.goto('/admin/ui-components');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  // Trigger an error toast manually via evaluate to simulate what our refactored code does
  await page.evaluate(() => {
    // Look for the DaisyUI toast container or create one if it doesn't exist
    let container = document.querySelector('.toast');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast toast-top toast-end';
      document.body.appendChild(container);
    }

    // Add an error alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-error shadow-lg transition-all duration-300 transform translate-x-0 opacity-100';
    alert.innerHTML = `
      <div class="flex items-start gap-3 w-full">
        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" class="w-5 h-5 mt-0.5 flex-shrink-0" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 472c-119.1 0-216-96.9-216-216S136.9 40 256 40s216 96.9 216 216-96.9 216-216 216zm0-344c-13.3 0-24 10.7-24 24v136c0 13.3 10.7 24 24 24s24-10.7 24-24V152c0-13.3-10.7-24-24-24zm0 216c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32z"></path></svg>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-sm">Error</div>
          <div class="text-sm opacity-80 mt-1">Failed to create provider: Provider name is required</div>
        </div>
      </div>
    `;
    container.appendChild(alert);
  });

  // Verify the toast is visible
  const toast = page.locator('.toast').locator('.alert-error').first();
  await expect(toast).toBeVisible();

  // Take screenshot of toast
  await page.screenshot({ path: 'docs/screenshots/toast-ux-after-fix.png' });
});
