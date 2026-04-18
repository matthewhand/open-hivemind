/**
 * Integration Test Helpers
 *
 * Provides utilities for conditional integration tests that:
 * 1. Check for required environment variables
 * 2. Skip tests if credentials not present
 * 3. Never log/leak sensitive credentials
 */

/**
 * Placeholder patterns that indicate a credential hasn't been set up yet.
 * Values matching these patterns are treated as "not configured".
 */
const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^your_/i,
  /^<.+>$/,
  /^CHANGE.?ME/i,
  /^xxx/i,
  /^test-token$/i,
  /^placeholder/i,
];

/**
 * Check if an environment variable exists, has a value, and is not a placeholder.
 */
export function hasEnvVar(name: string): boolean {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  return !PLACEHOLDER_PATTERNS.some((re) => re.test(value.trim()));
}

/**
 * Check if all required environment variables exist
 */
export function hasAllEnvVars(...names: string[]): boolean {
  return names.every(hasEnvVar);
}

/**
 * Get a safe description of which env vars are missing (without leaking values)
 */
export function getMissingEnvVars(...names: string[]): string[] {
  return names.filter((name) => !hasEnvVar(name));
}

/**
 * Conditional describe that skips if env vars are missing
 * Usage: describeIf(hasEnvVar('SLACK_BOT_TOKEN'), 'Slack Integration', () => { ... })
 */
export function describeIf(condition: boolean, name: string, fn: () => void): void {
  if (condition) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}

/**
 * Create a conditional test suite for a specific integration
 */
export function createIntegrationSuite(
  integrationName: string,
  requiredEnvVars: string[],
  testFn: () => void
): void {
  const missing = getMissingEnvVars(...requiredEnvVars);
  const force = process.env.FORCE_INTEGRATION_TESTS === 'true';

  if (missing.length > 0 && !force) {
    describe.skip(`${integrationName} Integration (missing: ${missing.join(', ')})`, () => {
      it('skipped - missing required env vars', () => {
        // This test is skipped
      });
    });
  } else {
    describe(`${integrationName} Integration`, testFn);
  }
}

/**
 * Redact sensitive values for safe logging
 */
export function redactValue(value: string | undefined): string {
  if (!value) return '<empty>';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Integration test configuration for each provider
 */
export const INTEGRATION_CONFIGS = {
  slack: {
    name: 'Slack',
    requiredEnvVars: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
  },
  discord: {
    name: 'Discord',
    requiredEnvVars: ['DISCORD_BOT_TOKEN'],
  },
  openai: {
    name: 'OpenAI',
    requiredEnvVars: ['OPENAI_API_KEY'],
  },
  flowise: {
    name: 'Flowise',
    requiredEnvVars: ['FLOWISE_API_KEY', 'FLOWISE_API_ENDPOINT'],
  },
  openwebui: {
    name: 'OpenWebUI',
    requiredEnvVars: ['OPENWEBUI_API_KEY', 'OPENWEBUI_BASE_URL'],
  },
  mattermost: {
    name: 'Mattermost',
    requiredEnvVars: ['MATTERMOST_TOKEN', 'MATTERMOST_URL'],
  },
  letta: {
    name: 'Letta',
    requiredEnvVars: ['LETTA_API_KEY'],
  },
} as const;

export type IntegrationName = keyof typeof INTEGRATION_CONFIGS;
