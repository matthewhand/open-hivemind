import { getRateLimitStats } from '../../../src/middleware/rateLimiter';

describe('getRateLimitStats', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return valid rate limit stats structure with current environment', () => {
    process.env.NODE_ENV = 'test';

    const stats = getRateLimitStats();

    expect(stats).toHaveProperty('redisAvailable');
    expect(typeof stats.redisAvailable).toBe('boolean');

    expect(stats).toHaveProperty('environment');
    expect(stats.environment).toBe('test');

    expect(stats).toHaveProperty('config');
    expect(stats.config).toHaveProperty('default');
    expect(stats.config).toHaveProperty('auth');
    expect(stats.config).toHaveProperty('config');
    expect(stats.config).toHaveProperty('admin');
    expect(stats.config).toHaveProperty('api');
  });

  it('should default to "development" if NODE_ENV is not set', () => {
    delete process.env.NODE_ENV;

    const stats = getRateLimitStats();

    expect(stats.environment).toBe('development');
  });
});
