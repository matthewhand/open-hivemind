/**
 * Contract tests for the LLM provider test endpoint.
 *
 * POST /api/admin/llm-providers/providers/:key/test
 *
 * This endpoint sends a test message to a specific LLM profile and returns
 * the response with latency and model info.
 */

import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('LLM Test Endpoint Contract', () => {
  let app: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.NODE_CONFIG_DIR = 'config/test/';

    // Clear require cache for the app
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('should reject missing message with 400', async () => {
    // The app needs to be loaded after env is set
    const { default: createApp } = await import('../../../../src/index');
    app = await createApp({ skipMessenger: true, skipDemoMode: true });

    const res = await request(app)
      .post('/api/admin/llm-providers/providers/test-key/test')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/message/i);
  });

  it('should return 404 for non-existent profile key', async () => {
    const { default: createApp } = await import('../../../../src/index');
    app = await createApp({ skipMessenger: true, skipDemoMode: true });

    const res = await request(app)
      .post('/api/admin/llm-providers/providers/nonexistent-key/test')
      .send({ message: 'hello' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should accept optional systemPrompt parameter', async () => {
    const { default: createApp } = await import('../../../../src/index');
    app = await createApp({ skipMessenger: true, skipDemoMode: true });

    // This will fail because no profile exists, but it validates the payload shape
    const res = await request(app)
      .post('/api/admin/llm-providers/providers/test-key/test')
      .send({ message: 'hello', systemPrompt: 'You are a test assistant' });

    // Should not be a 400 (payload accepted), will be 404 for missing key
    expect(res.status).not.toBe(400);
  });

  it('should rate-limit excessive requests', async () => {
    const { default: createApp } = await import('../../../../src/index');
    app = await createApp({ skipMessenger: true, skipDemoMode: true });

    // Send many requests quickly to trigger rate limiter
    const responses = await Promise.all(
      Array.from({ length: 150 }, () =>
        request(app)
          .post('/api/admin/llm-providers/providers/test-key/test')
          .send({ message: 'rate limit test' }),
      ),
    );

    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
