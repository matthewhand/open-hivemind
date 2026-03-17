import { isPrivateIP } from '@hivemind/shared-types';

describe('SSRF Protection', () => {
  describe('isPrivateIP', () => {
    it('should block private IPv4 ranges', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('192.168.1.1')).toBe(true);
    });

    it('should block loopback addresses', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
    });

    it('should block link-local addresses', () => {
      expect(isPrivateIP('169.254.1.1')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
    });
  });
});
