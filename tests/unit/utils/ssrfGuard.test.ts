import { isSafeUrl, isPrivateIP } from '../../../src/utils/ssrfGuard';

describe('ssrfGuard', () => {
  describe('isPrivateIP', () => {
    it('should detect private IPv4 addresses', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('0.0.0.0')).toBe(true);
      expect(isPrivateIP('169.254.0.1')).toBe(true);
    });

    it('should detect public IPv4 addresses', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('172.15.255.255')).toBe(false);
      expect(isPrivateIP('172.32.0.0')).toBe(false);
    });

    it('should detect private IPv6 addresses', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('0:0:0:0:0:0:0:1')).toBe(true);
      expect(isPrivateIP('::')).toBe(true);
      expect(isPrivateIP('fc00::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
      expect(isPrivateIP('fe80::1')).toBe(true);
    });

    it('should detect public IPv6 addresses', () => {
      expect(isPrivateIP('2001:4860:4860::8888')).toBe(false);
      expect(isPrivateIP('2606:4700::1')).toBe(false);
    });

    it('should return false for invalid IPs', () => {
      expect(isPrivateIP('invalid')).toBe(false);
      expect(isPrivateIP('')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    it('should reject invalid URLs', async () => {
      expect(await isSafeUrl('not-a-url')).toBe(false);
      expect(await isSafeUrl('')).toBe(false);
    });

    it('should reject non-HTTP protocols', async () => {
      expect(await isSafeUrl('ftp://example.com')).toBe(false);
      expect(await isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(await isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('should allow HTTP/HTTPS/WS/WSS protocols', async () => {
      expect(await isSafeUrl('http://example.com')).toBe(true);
      expect(await isSafeUrl('https://example.com')).toBe(true);
      expect(await isSafeUrl('ws://example.com')).toBe(true);
      expect(await isSafeUrl('wss://example.com')).toBe(true);
    });

    it('should reject private IP URLs when ALLOW_LOCAL_NETWORK_ACCESS is not set', async () => {
      const originalEnv = process.env.ALLOW_LOCAL_NETWORK_ACCESS;
      delete process.env.ALLOW_LOCAL_NETWORK_ACCESS;

      expect(await isSafeUrl('http://127.0.0.1')).toBe(false);
      expect(await isSafeUrl('http://192.168.1.1')).toBe(false);
      expect(await isSafeUrl('http://10.0.0.1')).toBe(false);

      process.env.ALLOW_LOCAL_NETWORK_ACCESS = originalEnv;
    });

    it('should allow private IP URLs when ALLOW_LOCAL_NETWORK_ACCESS is true', async () => {
      const originalEnv = process.env.ALLOW_LOCAL_NETWORK_ACCESS;
      process.env.ALLOW_LOCAL_NETWORK_ACCESS = 'true';

      expect(await isSafeUrl('http://127.0.0.1')).toBe(true);
      expect(await isSafeUrl('http://192.168.1.1')).toBe(true);

      process.env.ALLOW_LOCAL_NETWORK_ACCESS = originalEnv;
    });

    it('should reject DNS resolution failures', async () => {
      // Non-existent domain will fail DNS resolution
      expect(await isSafeUrl('http://this-domain-definitely-does-not-exist-12345.com')).toBe(false);
    });
  });
});
