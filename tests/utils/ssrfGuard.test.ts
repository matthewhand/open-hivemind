import dns from 'dns';
import { isPrivateIP, isSafeUrl } from '../../src/utils/ssrfGuard';

// Mock dns.promises.lookup
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('SSRF Guard', () => {
  const mockLookup = dns.promises.lookup as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.ALLOW_LOCAL_NETWORK_ACCESS = 'false';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isPrivateIP', () => {
    test('should identify private IPv4 addresses', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('169.254.1.1')).toBe(true);
      expect(isPrivateIP('0.0.0.0')).toBe(true);
    });

    test('should identify public IPv4 addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('172.32.0.1')).toBe(false); // Outside 172.16.0.0/12
      expect(isPrivateIP('11.0.0.1')).toBe(false);
    });

    test('should identify private IPv6 addresses', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd12:3456::1')).toBe(true);
      expect(isPrivateIP('fe80::1')).toBe(true);
    });

    test('should identify mapped IPv4 addresses', () => {
      expect(isPrivateIP('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIP('::ffff:192.168.1.1')).toBe(true);
      expect(isPrivateIP('::ffff:8.8.8.8')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    test('should allow safe public URLs', async () => {
      mockLookup.mockResolvedValue({ address: '93.184.216.34' }); // example.com
      expect(await isSafeUrl('https://example.com')).toBe(true);
    });

    test('should block private IP literals', async () => {
      expect(await isSafeUrl('http://192.168.1.1')).toBe(false);
      expect(mockLookup).not.toHaveBeenCalled(); // Should handle literals without DNS
    });

    test('should block localhost literal', async () => {
      expect(await isSafeUrl('http://127.0.0.1')).toBe(false);
    });

    test('should block domains resolving to private IP', async () => {
      mockLookup.mockResolvedValue({ address: '10.0.0.5' });
      expect(await isSafeUrl('http://internal.service')).toBe(false);
    });

    test('should block unsafe protocols', async () => {
      expect(await isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(await isSafeUrl('ftp://example.com')).toBe(false);
      expect(await isSafeUrl('javascript:alert(1)')).toBe(false);
      expect(await isSafeUrl('stdio://cmd')).toBe(false);
    });

    test('should allow WS/WSS protocols', async () => {
      mockLookup.mockResolvedValue({ address: '93.184.216.34' });
      expect(await isSafeUrl('wss://example.com')).toBe(true);
    });

    test('should allow localhost if env var is set', async () => {
      process.env.ALLOW_LOCAL_NETWORK_ACCESS = 'true';
      expect(await isSafeUrl('http://127.0.0.1')).toBe(true);

      mockLookup.mockResolvedValue({ address: '127.0.0.1' });
      expect(await isSafeUrl('http://localhost:3000')).toBe(true);
    });

    test('should fail safely on invalid URLs', async () => {
      expect(await isSafeUrl('not-a-url')).toBe(false);
    });

    test('should fail safely on DNS error', async () => {
      mockLookup.mockRejectedValue(new Error('DNS Error'));
      expect(await isSafeUrl('http://nonexistent.domain')).toBe(false);
    });
  });
});
