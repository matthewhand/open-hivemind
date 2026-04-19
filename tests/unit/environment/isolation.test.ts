/**
 * Regression test: ensure production env vars do not leak into test scope.
 *
 * Root cause: .env file was loaded during test runs, causing env-dependent
 * tests to pass locally but fail in CI where .env is not present.
 *
 * Fix: NODE_CONFIG_DIR=config/test/ + NODE_ENV=test ensures isolated config.
 */

const PRODUCTION_ENV_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_API_KEY',
  'DISCORD_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET',
];

describe('Environment isolation', () => {
  it('should not expose production env vars in test scope', () => {
    PRODUCTION_ENV_KEYS.forEach((key) => {
      // In test scope, these should be undefined or test-safe values
      const value = process.env[key];
      if (value) {
        // If present, it must be a test-safe placeholder
        expect(value).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
        expect(value).not.toMatch(/^xoxb-/);
        expect(value).not.toMatch(/^ghp_/);
      }
    });
  });

  it('should use test config directory', () => {
    expect(process.env.NODE_CONFIG_DIR).toBe('config/test/');
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
