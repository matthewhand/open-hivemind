import { test } from '@playwright/test';
import { setupTestWithErrorDetection } from './test-utils';

test('Debug page content', async ({ page }) => {
  await setupTestWithErrorDetection(page);
  
  console.log('Navigating to /admin/system-management...');
  await page.goto('/admin/system-management');
  
  await page.waitForTimeout(5000);
  console.log('Current URL:', page.url());
  console.log('Page Title:', await page.title());
  
  await page.screenshot({ path: 'test-results/debug-1.png' });
  
  const bodyText = await page.innerText('body');
  console.log('Body text (first 200 chars):', bodyText.substring(0, 200));
  
  if (bodyText.includes('Login')) {
    console.log('🔴 Redirected to Login!');
  }
  
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'test-results/debug-2.png' });
});
