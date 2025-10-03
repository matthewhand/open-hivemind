import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://playwright.dev/docs/test-configuration#launching-the-browser-with-variables-set-from-dotenv-file
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Timeouts */
  timeout: 30000,
  expect: {
    /**
     * Maximum time to wait for expect statements, default is 5000.
     */
    timeout: 5000,
  },
  /* Constant to use with Playwright test hooks. */
  use: {
    /* Base URL to use when running tests locally. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5005',
    /* Collect trace when retrying on CI. */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5005',
    reuseExistingServer: !process.env.CI,
  },
});
