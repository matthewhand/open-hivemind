/**
 * Contract tests for the LLM provider test endpoint.
 *
 * POST /api/admin/llm-providers/providers/:key/test
 *
 * These tests require the full app bootstrap (src/index exports a pre-built
 * Express app, not a factory function). They are skipped until the app
 * supports a test-friendly factory pattern like createApp({ skipMessenger }).
 */

describe.skip('LLM Test Endpoint Contract (requires app factory)', () => {
  it.todo('should reject missing message with 400');
  it.todo('should return 404 for non-existent profile key');
  it.todo('should accept optional systemPrompt parameter');
  it.todo('should rate-limit excessive requests');
});
