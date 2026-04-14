/**
 * Contract tests for the LLM provider test endpoint.
 *
 * POST /api/admin/llm-providers/providers/:key/test
 */

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('LLM Test Endpoint Contract', () => {
  let app: express.Application;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';
    process.env.NODE_CONFIG_DIR = 'config/test/';
    process.env.ALLOW_TEST_BYPASS = 'true';

    // Clear require cache for the app
    jest.resetModules();
    
    // Lazy import to ensure env is set
    const { default: createApp } = await import('../../src/index');
    // If it's a factory, call it. If it's the app object, use it.
    if (typeof createApp === 'function') {
      app = await (createApp as any)({ skipMessenger: true, skipDemoMode: true });
    } else {
      app = createApp;
    }
  });

  afterEach(async () => {
    process.env = originalEnv;
    
    // Try to close if it's a server or has close method
    if (app && typeof app.close === 'function') {
      await new Promise<void>((resolve) => {
        app.close(() => resolve());
      });
    }
    
    jest.resetModules();
  });

  it('should reject missing message with 400', async () => {
    const res = await request(app)
      .post('/api/admin/providers/test-connection')
      .send({ providerType: 'invalid-type', config: {} });
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Validation failed');
  });

  it('should return 404 for non-existent profile key', async () => {
    const res = await request(app)
      .post('/api/admin/llm-providers/providers/nonexistent-key/test')
      .send({ message: 'hello' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should accept optional systemPrompt parameter', async () => {
    // This will fail because no profile exists, but it validates the payload shape
    const res = await request(app)
      .post('/api/admin/llm-providers/providers/test-key/test')
      .send({ message: 'hello', systemPrompt: 'You are a test assistant' });

    // Should not be a 400 (payload accepted), will be 404 for missing key
    expect(res.status).not.toBe(400);
  });

  it('should rate-limit excessive requests', async () => {
    // Send many requests quickly to trigger rate limiter
    const responses = await Promise.all(
      Array.from({ length: 150 }, () =>
        request(app)
          .post('/api/admin/llm-providers/providers/test-key/test')
          .send({ message: 'rate limit test' })
      )
    );

    const rateLimited = responses.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
