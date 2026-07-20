import { getTrustedProxies, isTrustedProxy } from '../../../src/middleware/rateLimiterCore';

describe('getTrustedProxies', () => {
  const originalTrustedProxies = process.env.TRUSTED_PROXIES;

  afterEach(() => {
    if (originalTrustedProxies === undefined) {
      delete process.env.TRUSTED_PROXIES;
    } else {
      process.env.TRUSTED_PROXIES = originalTrustedProxies;
    }
  });

  it('defaults to loopback only when TRUSTED_PROXIES is unset', () => {
    delete process.env.TRUSTED_PROXIES;
    expect(getTrustedProxies()).toEqual(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  });

  it('does not trust RFC1918 ranges by default', () => {
    delete process.env.TRUSTED_PROXIES;
    const proxies = getTrustedProxies();
    expect(proxies).not.toContain('10.0.0.0/8');
    expect(proxies).not.toContain('172.16.0.0/12');
    expect(proxies).not.toContain('192.168.0.0/16');
    expect(isTrustedProxy('10.0.0.1')).toBe(false);
    expect(isTrustedProxy('192.168.1.1')).toBe(false);
    expect(isTrustedProxy('172.16.0.5')).toBe(false);
  });

  it('still trusts loopback by default', () => {
    delete process.env.TRUSTED_PROXIES;
    expect(isTrustedProxy('127.0.0.1')).toBe(true);
    expect(isTrustedProxy('::1')).toBe(true);
  });

  it('honours explicit TRUSTED_PROXIES list including private ranges', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.0/8, 192.168.1.1';
    expect(getTrustedProxies()).toEqual(['10.0.0.0/8', '192.168.1.1']);
    expect(isTrustedProxy('10.4.5.6')).toBe(true);
    expect(isTrustedProxy('192.168.1.1')).toBe(true);
    expect(isTrustedProxy('172.16.0.1')).toBe(false);
  });

  it('trims and filters empty entries from TRUSTED_PROXIES', () => {
    process.env.TRUSTED_PROXIES = ' 127.0.0.1 , , 10.0.0.1 ';
    expect(getTrustedProxies()).toEqual(['127.0.0.1', '10.0.0.1']);
  });
});
