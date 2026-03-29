import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests.
 * This can be used to perform one-time setup like authentication.
 */
async function globalSetup(config: FullConfig) {
  // Example: Perform initial authentication and save state
}

export default globalSetup;
