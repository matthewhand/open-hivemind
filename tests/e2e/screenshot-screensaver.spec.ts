import { test } from '@playwright/test';
import { setupAuth } from './test-utils';

test('capture screensaver', async ({ page }) => {
  // Set viewport to standard desktop size
  await page.setViewportSize({ width: 1280, height: 800 });

  // Setup authentication (though route might be public, good practice)
  await setupAuth(page);

  // Navigate directly to the screensaver route
  await page.goto('/screensaver');

  // Wait for the component to mount and animations to start (logs to fill)
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'docs/screenshots/screensaver.png' });
});
