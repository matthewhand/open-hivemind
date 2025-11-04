import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests.
 * This can be used to perform cleanup after all tests have run.
 */
async function globalTeardown(config: FullConfig) {
  // Example: Clean up test data, close connections, etc.
  console.log('Global teardown completed');
}

export default globalTeardown;