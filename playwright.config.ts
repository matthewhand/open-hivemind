import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://playwright.dev/docs/test-configuration#launching-the-browser-with-variables-set-from-dotenv-file
 */
// require('dotenv').config();

/**
 * Enhanced Playwright configuration for open-hivemind project
 * Supports desktop, mobile, tablet testing with visual regression and accessibility testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Store Playwright artifacts here */
  outputDir: 'test-results',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Global setup for test data and authentication */
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  /* Global teardown for cleanup */
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  /* Timeouts */
  timeout: 60000,
  expect: {
    /**
     * Maximum time to wait for expect statements, default is 5000.
     */
    timeout: 10000,
  },
  /* Constant to use with Playwright test hooks. */
  use: {
    /* Base URL to use when running tests locally. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3028',
    /* Collect trace when retrying on CI. */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    /* Capture screenshots for failed tests */
    screenshot: 'only-on-failure',
    /* Record videos for diagnostics in CI */
    video: process.env.CI ? 'retain-on-failure' : 'off',
    /* Enable accessibility testing */
    colorScheme: 'light',
    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,
    /* User agent for consistent testing */
    userAgent: 'Open-Hivemind-E2E-Tests',
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
  },

  /* Configure projects for major browsers and devices */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write']
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Enhanced reporters */
  reporter: process.env.CI ? [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ['github'],
  ] : [
    ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
    ['line']
  ],

  /* Retry configuration */
  retries: process.env.CI ? 2 : 0,

  /* Test organization */
  grep: process.env.GREP ? new RegExp(process.env.GREP) : undefined,
  grepInvert: process.env.GREP_INVERT ? new RegExp(process.env.GREP_INVERT) : undefined,

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'export NODE_OPTIONS="--max-old-space-size=4096"; export DISABLE_RATE_LIMIT=true; export ALLOW_LOCALHOST_ADMIN=true; export OPENAI_API_KEY=sk-test-dummy-key; export DISCORD_BOT_TOKEN=dummy-token; npm run dev',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3028',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Metadata for test organization */
  metadata: {
    'Test Environment': process.env.NODE_ENV || 'test',
    'Browser Versions': 'Latest',
    'Test Suite': 'E2E Tests',
  },

  /* Global test configuration */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
  ],

  /* Test file patterns */
  testMatch: [
    '**/*.spec.ts',
    '**/*.e2e.ts',
    '**/*.test.ts',
  ],
});
