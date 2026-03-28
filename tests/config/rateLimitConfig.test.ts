import rateLimitConfig from '../../src/config/rateLimitConfig';

describe('rateLimitConfig', () => {
  it('should export default rate limit settings', () => {
    expect(rateLimitConfig.default).toBeDefined();
    expect(rateLimitConfig.default.windowMs).toBe(15 * 60 * 1000);
    expect(rateLimitConfig.default.max).toBe(100);
  });

  it('should export config rate limit settings', () => {
    expect(rateLimitConfig.config).toBeDefined();
    expect(rateLimitConfig.config.max).toBe(10);
  });

  it('should export auth rate limit settings', () => {
    expect(rateLimitConfig.auth).toBeDefined();
    expect(rateLimitConfig.auth.max).toBe(5);
  });

  it('should export admin rate limit settings', () => {
    expect(rateLimitConfig.admin).toBeDefined();
    expect(rateLimitConfig.admin.windowMs).toBe(15 * 60 * 1000);
    expect(rateLimitConfig.admin.max).toBe(20);
  });

  it('should export redis configuration', () => {
    expect(rateLimitConfig.redis).toBeDefined();
    expect(rateLimitConfig.redis.prefix).toBe('rate_limit:');
    expect(rateLimitConfig.redis.maxRetriesPerRequest).toBe(3);
    expect(rateLimitConfig.redis.enableOfflineQueue).toBe(false);
  });

  it('should have all window values as positive numbers', () => {
    expect(rateLimitConfig.default.windowMs).toBeGreaterThan(0);
    expect(rateLimitConfig.config.windowMs).toBeGreaterThan(0);
    expect(rateLimitConfig.auth.windowMs).toBeGreaterThan(0);
    expect(rateLimitConfig.admin.windowMs).toBeGreaterThan(0);
  });

  it('should have all max values as positive integers', () => {
    expect(Number.isInteger(rateLimitConfig.default.max)).toBe(true);
    expect(Number.isInteger(rateLimitConfig.config.max)).toBe(true);
    expect(Number.isInteger(rateLimitConfig.auth.max)).toBe(true);
    expect(Number.isInteger(rateLimitConfig.admin.max)).toBe(true);
  });
});
