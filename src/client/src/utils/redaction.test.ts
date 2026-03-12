import {
    redactString,
    redactEmail,
    redactPhone,
    redactIpAddress,
    redactUuid,
    configureRedaction,
    setAdminBypass,
    isAdminBypassEnabled,
    getRedactionConfig,
    createRedactor,
} from './redaction';

describe('redaction', () => {
    beforeEach(() => {
        // Reset to default config before each test
        configureRedaction({ level: 'strict', allowAdminBypass: false });
        setAdminBypass(false);
    });

    describe('redactString', () => {
        it('should return empty string for undefined/null values', () => {
            expect(redactString(undefined)).toBe('');
            expect(redactString(null)).toBe('');
            expect(redactString('')).toBe('');
        });

        it('should fully redact short strings (3 chars or less) in strict mode', () => {
            expect(redactString('ab')).toBe('***');
            expect(redactString('abc')).toBe('***');
        });

        it('should show first and last char with mask for longer strings in strict mode', () => {
            expect(redactString('user123')).toBe('u***3');
            expect(redactString('testuser')).toBe('t***r');
        });

        it('should support custom mask options', () => {
            expect(redactString('testuser', { showFirst: 2, showLast: 2, maskChar: '#' })).toBe('te###er');
        });
    });

    describe('admin bypass', () => {
        it('should not allow bypass by default', () => {
            setAdminBypass(true);
            expect(isAdminBypassEnabled()).toBe(false);
        });

        it('should allow bypass when configured', () => {
            configureRedaction({ allowAdminBypass: true });
            setAdminBypass(true);
            expect(isAdminBypassEnabled()).toBe(true);
        });

        it('should show original value with indicator when bypass is enabled', () => {
            configureRedaction({ allowAdminBypass: true });
            setAdminBypass(true);
            expect(redactString('sensitive')).toBe('🔓 sensitive');
        });
    });

    describe('redaction levels', () => {
        it('should use strict redaction by default', () => {
            const config = getRedactionConfig();
            expect(config.level).toBe('strict');
        });

        it.skip('should support moderate level', () => {
            configureRedaction({ level: 'moderate' });
            expect(redactString('user123')).toBe('us****23');
            expect(redactString('ab')).toBe('**');
        });

        it('should support minimal level', () => {
            configureRedaction({ level: 'minimal' });
            expect(redactString('user123')).toBe('use...23');
            expect(redactString('ab')).toBe('**');
        });
    });

    describe('redactEmail', () => {
        it('should return empty string for undefined', () => {
            expect(redactEmail(undefined)).toBe('');
        });

        it.skip('should redact email addresses', () => {
            expect(redactEmail('user@example.com')).toBe('u***r@e***e.com');
        });

        it.skip('should handle short local parts', () => {
            expect(redactEmail('ab@test.com')).toBe('***@t***t.com');
        });
    });

    describe('redactPhone', () => {
        it('should return empty string for undefined', () => {
            expect(redactPhone(undefined)).toBe('');
        });

        it.skip('should redact phone numbers showing only last 4 digits', () => {
            expect(redactPhone('555-123-4567')).toBe('*******4567');
            expect(redactPhone('+1 (555) 123-4567')).toBe('**********4567');
        });

        it('should fully redact short numbers', () => {
            expect(redactPhone('1234')).toBe('***');
        });
    });

    describe('redactIpAddress', () => {
        it('should return empty string for undefined', () => {
            expect(redactIpAddress(undefined)).toBe('');
        });

        it('should redact IPv4 addresses', () => {
            expect(redactIpAddress('192.168.1.1')).toBe('192.***.***.1');
        });

        it('should redact IPv6 addresses', () => {
            expect(redactIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
                '2001:****:****:****:****:****:****:7334'
            );
        });
    });

    describe('redactUuid', () => {
        it('should return empty string for undefined', () => {
            expect(redactUuid(undefined)).toBe('');
        });

        it('should redact UUIDs showing first and last 4 chars', () => {
            expect(redactUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e...0000');
        });

        it('should fully redact short strings', () => {
            expect(redactUuid('abc')).toBe('***');
        });
    });

    describe('createRedactor', () => {
        it.skip('should create a redactor with all methods', () => {
            const redactor = createRedactor();
            expect(redactor.string('test')).toBe('t***t');
            expect(redactor.email('test@test.com')).toBe('t***t@t***t.com');
            expect(redactor.phone('555-5555')).toBe('*5555');
            expect(redactor.ip('1.2.3.4')).toBe('1.***.***.4');
            expect(redactor.uuid('abcd-1234')).toBe('abcd...1234');
        });

        it.skip('should allow changing redaction level', () => {
            const redactor = createRedactor();
            redactor.setLevel('moderate');
            expect(redactor.string('testuser')).toBe('te****er');
        });
    });
});
