// Ensure test environment variables are set before importing anything
process.env.HTTP_ENABLED = 'false';
process.env.SKIP_MESSENGERS = 'true';
process.env.SUPPRESS_HEALTH_LOGS = 'true';
process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../../src/index';
// @ts-ignore
import { shutdownRateLimiter } from '../../src/middleware/rateLimiter';

describe('Security Headers', () => {
  afterAll(async () => {
    // Clean up rate limiter intervals
    if (shutdownRateLimiter) {
        shutdownRateLimiter();
    }

    // Also try to close any other handles if possible.
    // Since main() runs, we might have other things.
    // But let's see if this is enough.
  });

  it('should have strict Content-Security-Policy script-src in production/test environment', async () => {
    const res = await request(app).get('/');

    expect(res.header['x-content-type-options']).toBe('nosniff');

    const csp = res.header['content-security-policy'];
    expect(csp).toBeDefined();

    // Parse CSP directives
    const directives: Record<string, string> = {};
    csp.split(';').forEach((part: string) => {
      const trimmed = part.trim();
      if (!trimmed) return;
      const [key, ...values] = trimmed.split(/\s+/);
      directives[key] = values.join(' ');
    });

    // Check script-src
    const scriptSrc = directives['script-src'];
    expect(scriptSrc).toBeDefined();

    // Should contain 'self'
    expect(scriptSrc).toContain("'self'");

    // Should NOT contain unsafe directives
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });
});
