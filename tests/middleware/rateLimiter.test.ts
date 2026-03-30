import { NextFunction, Request, Response } from 'express';
import {
  applyRateLimiting,
  getClientKey,
  getTrustedProxies,
  ipToLong,
  isIPInCIDR,
  isTrustedProxy,
  validateIP,
} from '../../src/middleware/rateLimiter';

describe('rateLimiter middleware utilities', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      path: '/api/test',
      method: 'GET',
      headers: {},
      get: jest.fn(),
      socket: { remoteAddress: '192.168.1.1' } as any,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };

    next = jest.fn();

    // Clear mock data
    jest.clearAllMocks();

    // reset process.env modifications
    delete process.env.TRUSTED_PROXIES;
    delete process.env.DISABLE_RATE_LIMIT;
  });

  describe('validateIP', () => {
    it('validates correct IPv4 addresses', () => {
      expect(validateIP('192.168.1.1')).toBe('192.168.1.1');
      expect(validateIP('8.8.8.8')).toBe('8.8.8.8');
      expect(validateIP('255.255.255.255')).toBe('255.255.255.255');
    });

    it('rejects invalid IPv4 addresses', () => {
      expect(validateIP('256.1.2.3')).toBeNull();
      expect(validateIP('1.2.3')).toBeNull();
      expect(validateIP('not.an.ip')).toBeNull();
      expect(validateIP('01.2.3.4')).toBeNull(); // octal
    });

    it('extracts IPv4 from IPv4-mapped IPv6', () => {
      expect(validateIP('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('rejects IPs with malicious characters', () => {
      expect(validateIP('192.168.1.1\r\n')).toBeNull();
      expect(validateIP('192.168.1.1\0')).toBeNull();
    });

    it('validates simple IPv6 addresses', () => {
      expect(validateIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBeTruthy();
      expect(validateIP('::1')).toBeTruthy();
    });
  });

  describe('ipToLong', () => {
    it('converts IP to long representation', () => {
      expect(ipToLong('0.0.0.0')).toBe(0);
      expect(ipToLong('255.255.255.255')).toBe(4294967295);
      expect(ipToLong('192.168.1.1')).toBe(3232235777);
    });

    it('returns NaN for invalid IP', () => {
      expect(ipToLong('invalid')).toBeNaN();
      expect(ipToLong('256.0.0.1')).toBeNaN();
    });
  });

  describe('isIPInCIDR', () => {
    it('correctly matches IP in CIDR', () => {
      expect(isIPInCIDR('192.168.1.5', '192.168.1.0/24')).toBe(true);
      expect(isIPInCIDR('10.0.5.1', '10.0.0.0/8')).toBe(true);
    });

    it('correctly rejects IP outside CIDR', () => {
      expect(isIPInCIDR('192.168.2.5', '192.168.1.0/24')).toBe(false);
      expect(isIPInCIDR('11.0.5.1', '10.0.0.0/8')).toBe(false);
    });

    it('returns false for invalid inputs', () => {
      expect(isIPInCIDR('invalid', '192.168.1.0/24')).toBe(false);
      expect(isIPInCIDR('192.168.1.5', 'invalid/24')).toBe(false);
    });
  });

  describe('isTrustedProxy / getTrustedProxies', () => {
    it('returns default trusted proxies when env var is not set', () => {
      const proxies = getTrustedProxies();
      expect(proxies).toContain('127.0.0.1');
      expect(proxies).toContain('10.0.0.0/8');
    });

    it('identifies default trusted proxies', () => {
      expect(isTrustedProxy('127.0.0.1')).toBe(true);
      expect(isTrustedProxy('10.1.2.3')).toBe(true);
      expect(isTrustedProxy('192.168.1.1')).toBe(true);
      expect(isTrustedProxy('8.8.8.8')).toBe(false); // external IP
    });
  });

  describe('getClientKey', () => {
    it('uses connection IP when proxy is untrusted', () => {
      req.socket = { remoteAddress: '8.8.8.8' } as any;
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '1.2.3.4';
        return null;
      });

      const key = getClientKey(req as Request);
      expect(key).toBe('8.8.8.8'); // ignores 1.2.3.4 because 8.8.8.8 is untrusted proxy
    });

    it('extracts correct IP from X-Forwarded-For when proxy is trusted', () => {
      req.socket = { remoteAddress: '192.168.1.1' } as any; // Trusted
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'x-forwarded-for') return '1.2.3.4, 10.0.0.1'; // client, intermediate proxy
        return null;
      });

      const key = getClientKey(req as Request);
      // Right-most non-trusted IP is 1.2.3.4
      expect(key).toBe('1.2.3.4');
    });

    it('uses X-Real-IP if X-Forwarded-For is absent but proxy is trusted', () => {
      req.socket = { remoteAddress: '192.168.1.1' } as any; // Trusted
      (req.get as jest.Mock).mockImplementation((header) => {
        if (header === 'x-real-ip') return '1.2.3.4';
        return null;
      });

      const key = getClientKey(req as Request);
      expect(key).toBe('1.2.3.4');
    });
  });

  describe('applyRateLimiting', () => {
    it('skips rate limiting when DISABLE_RATE_LIMIT is true', () => {
      process.env.DISABLE_RATE_LIMIT = 'true';
      applyRateLimiting(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });

    it('skips rate limiting for health check paths', () => {
      req.path = '/health';
      applyRateLimiting(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();

      jest.clearAllMocks();
      req.path = '/api/health';
      applyRateLimiting(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });

    // In test environments, it skips by default, which is handled implicitly by shouldSkipRateLimit being true
    it('skips rate limiting in test environment by default', () => {
      applyRateLimiting(req as Request, res as Response, next as NextFunction);
      expect(next).toHaveBeenCalled();
    });
  });
});
