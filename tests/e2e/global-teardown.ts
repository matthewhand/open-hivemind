import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Playwright tests');
  
  // Clean up any test artifacts if needed
  // This is a good place to clean up test data, close connections, etc.
  
  // Log test completion
  console.log('✅ Global teardown completed');
  console.log('🎉 All Playwright tests finished');
}

export default globalTeardown;