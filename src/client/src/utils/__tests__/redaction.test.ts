import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    redactString,
    redactEmail,
    redactPhone,
    redactIpAddress,
    redactUuid,
    configureRedaction,
    setAdminBypass,
    createRedactor,
    isAdminBypassEnabled
} from '../redaction';

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
            expect(redactString('abc')).toBe('***');
            expect(redactString('ab')).toBe('***');
            expect(redactString('a')).toBe('***');
        });

        it('should show first and last char with mask for longer strings in strict mode', () => {
            expect(redactString('user123')).toBe('u***r');
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
            expect(redactString('testuser')).toBe('t***r');
        });

        it('should allow bypass when configured', () => {
            configureRedaction({ allowAdminBypass: true });
            setAdminBypass(true);
            expect(isAdminBypassEnabled()).toBe(true);
        });

        it('should show original value with indicator when bypass is enabled', () => {
            configureRedaction({ allowAdminBypass: true });
            setAdminBypass(true);
            expect(redactString('testuser')).toBe('🔓 testuser');
            expect(redactEmail('test@example.com')).toBe('🔓 test@example.com');
        });
    });

    describe('redaction levels', () => {
        it('should use strict redaction by default', () => {
            expect(redactString('user123')).toBe('u***3');
        });

        it('should support moderate level', () => {
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

        it('should redact email addresses', () => {
            expect(redactEmail('user@example.com')).toBe('u***r@e***e.com');
        });

        it('should handle short local parts', () => {
            expect(redactEmail('ab@test.com')).toBe('***@t***t.com');
        });
    });

    describe('redactPhone', () => {
        it('should return empty string for undefined', () => {
            expect(redactPhone(undefined)).toBe('');
        });

        it('should redact phone numbers showing only last 4 digits', () => {
            expect(redactPhone('555-123-4567')).toBe('*******4567');
            expect(redactPhone('+1 (555) 123-4567')).toBe('*******4567');
        });

        it('should fully redact short numbers', () => {
            expect(redactPhone('123')).toBe('***');
        });
    });

    describe('redactIpAddress', () => {
        it('should return empty string for undefined', () => {
            expect(redactIpAddress(undefined)).toBe('');
        });

        it('should redact IPv4 addresses', () => {
            expect(redactIpAddress('192.168.1.100')).toBe('192.***.***.100');
        });

        it('should redact IPv6 addresses', () => {
            expect(redactIpAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('2001:****:****:****:****:****:****:7334');
        });
    });

    describe('redactUuid', () => {
        it('should return empty string for undefined', () => {
            expect(redactUuid(undefined)).toBe('');
        });

        it('should redact UUIDs showing first and last 4 chars', () => {
            expect(redactUuid('123e4567-e89b-12d3-a456-426614174000')).toBe('123e...4000');
        });

        it('should fully redact short strings', () => {
            expect(redactUuid('1234567')).toBe('***');
        });
    });

    describe('createRedactor', () => {
        it('should create a redactor with all methods', () => {
            const redactor = createRedactor();
            expect(redactor.string('test')).toBe('t***t');
            expect(redactor.email('test@test.com')).toBe('t***t@t***t.com');
            expect(redactor.phone('555-5555')).toBe('*5555');
            expect(redactor.ip('1.2.3.4')).toBe('1.***.***.4');
            expect(redactor.uuid('abcd-1234')).toBe('abcd...1234');
        });

        it('should allow changing redaction level', () => {
            const redactor = createRedactor();
            redactor.setLevel('moderate');
            expect(redactor.string('testuser')).toBe('te****er');
        });
    });
});
