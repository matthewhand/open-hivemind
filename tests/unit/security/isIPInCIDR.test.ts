import { isIPInCIDR } from '@src/server/middleware/security';

describe('isIPInCIDR', () => {
  describe('IPv4', () => {
    it('should match simple IPv4 ranges', () => {
      expect(isIPInCIDR('192.168.1.1', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('192.168.2.1', '192.168.1.0/24')).toBe(false);
    });

    it('should handle /0 prefix (match all)', () => {
      expect(isIPInCIDR('1.2.3.4', '0.0.0.0/0')).toBe(true);
      expect(isIPInCIDR('192.168.1.1', '0.0.0.0/0')).toBe(true);
    });

    it('should handle /32 prefix', () => {
      expect(isIPInCIDR('192.168.1.1', '192.168.1.1/32')).toBe(true);
      expect(isIPInCIDR('192.168.1.2', '192.168.1.1/32')).toBe(false);
    });
  });

  describe('IPv6', () => {
    it('should match simple IPv6 ranges', () => {
      expect(isIPInCIDR('2001:db8::1', '2001:db8::/32')).toBe(true);
      expect(isIPInCIDR('2002:db8::1', '2001:db8::/32')).toBe(false);
    });

    it('should match loopback', () => {
      expect(isIPInCIDR('::1', '::1/128')).toBe(true);
      expect(isIPInCIDR('::2', '::1/128')).toBe(false);
    });

    it('should handle large ranges (e.g. fc00::/7)', () => {
      expect(isIPInCIDR('fc00::1', 'fc00::/7')).toBe(true);
      expect(isIPInCIDR('fd00::1', 'fc00::/7')).toBe(true);
      expect(isIPInCIDR('fe00::1', 'fc00::/7')).toBe(false);
    });

    it('should handle IPv6 /0 prefix', () => {
      expect(isIPInCIDR('2001:db8::1', '::/0')).toBe(true);
      expect(isIPInCIDR('::1', '::/0')).toBe(true);
    });
  });

  describe('IPv4-mapped IPv6', () => {
    it('should match mapped IPv4 address against IPv4 CIDR', () => {
      expect(isIPInCIDR('::ffff:192.168.1.1', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('::ffff:192.168.2.1', '192.168.1.0/24')).toBe(false);
    });

    it('should match mapped IPv4 address against IPv6 CIDR if range covers it', () => {
      // ::ffff:192.168.1.1 is ::ffff:c0a8:0101
      expect(isIPInCIDR('::ffff:192.168.1.1', '::ffff:0:0/96')).toBe(true);
    });
  });

  describe('Invalid inputs', () => {
    it('should return false for malformed IPs', () => {
      expect(isIPInCIDR('not-an-ip', '192.168.1.0/24')).toBe(false);
    });

    it('should return false for malformed CIDRs', () => {
      expect(isIPInCIDR('192.168.1.1', 'not-a-cidr')).toBe(false);
      expect(isIPInCIDR('192.168.1.1', '192.168.1.1/abc')).toBe(false);
    });
  });
});

// Regression: isTrustedAdminIP previously short-circuited for native IPv6
// before calling isIPInCIDR, meaning IPv6 CIDRs in ADMIN_IP_WHITELIST were
// silently ignored. Verify isIPInCIDR itself handles these correctly so the
// fixed isTrustedAdminIP can rely on it.
describe('IPv6 CIDR regression — isTrustedAdminIP guard', () => {
  it('matches loopback ::1 against /128 prefix', () => {
    expect(isIPInCIDR('::1', '::1/128')).toBe(true);
  });

  it('does not match a different IPv6 address against /128', () => {
    expect(isIPInCIDR('::2', '::1/128')).toBe(false);
  });

  it('matches an address inside a ULA fc00::/7 range', () => {
    expect(isIPInCIDR('fc00::1', 'fc00::/7')).toBe(true);
  });

  it('matches a documentation prefix 2001:db8::/32', () => {
    expect(isIPInCIDR('2001:db8::1', '2001:db8::/32')).toBe(true);
    expect(isIPInCIDR('2001:db9::1', '2001:db8::/32')).toBe(false);
  });

  it('rejects an out-of-range prefix length for IPv6', () => {
    expect(isIPInCIDR('::1', '::1/129')).toBe(false);
  });
});
