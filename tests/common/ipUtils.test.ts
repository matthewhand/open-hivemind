import { isIpWhitelisted } from '../../src/common/ipUtils';

describe('ipUtils', () => {
    describe('isIpWhitelisted', () => {
        const whitelist = [
            '127.0.0.1',
            '192.168.1.0/24',
            '10.0.0.0/8',
            '::1'
        ];

        it('should return false for empty whitelist', () => {
            expect(isIpWhitelisted('127.0.0.1', [])).toBe(false);
        });

        it('should return true for exact match', () => {
            expect(isIpWhitelisted('127.0.0.1', whitelist)).toBe(true);
            expect(isIpWhitelisted('::1', whitelist)).toBe(true);
        });

        it('should return false for non-matching IP', () => {
            expect(isIpWhitelisted('127.0.0.2', whitelist)).toBe(false);
            expect(isIpWhitelisted('8.8.8.8', whitelist)).toBe(false);
        });

        it('should return true for IP in CIDR range (192.168.1.x)', () => {
            expect(isIpWhitelisted('192.168.1.1', whitelist)).toBe(true);
            expect(isIpWhitelisted('192.168.1.255', whitelist)).toBe(true);
        });

        it('should return false for IP outside CIDR range (192.168.2.x)', () => {
            expect(isIpWhitelisted('192.168.2.1', whitelist)).toBe(false);
        });

        it('should return true for IP in large CIDR range (10.x.x.x)', () => {
            expect(isIpWhitelisted('10.1.2.3', whitelist)).toBe(true);
        });

        it('should handle IPv6 mapped IPv4 addresses', () => {
            expect(isIpWhitelisted('::ffff:127.0.0.1', whitelist)).toBe(true);
            expect(isIpWhitelisted('::ffff:192.168.1.5', whitelist)).toBe(true);
        });

        it('should handle whitespace in whitelist', () => {
            const dirtyWhitelist = [' 127.0.0.1 ', ' 10.0.0.0/8 '];
            expect(isIpWhitelisted('127.0.0.1', dirtyWhitelist)).toBe(true);
            expect(isIpWhitelisted('10.0.0.1', dirtyWhitelist)).toBe(true);
        });
    });
});
