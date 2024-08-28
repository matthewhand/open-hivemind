import { redactSensitiveInfo } from './redactSensitiveInfo';

// Unit tests for redactSensitiveInfo function

describe('redactSensitiveInfo', () => {
    test('should redact a Discord token', () => {
        const result = redactSensitiveInfo('DISCORD_TOKEN', 'abcdefg1234567890abcdefg');
        expect(result).toBe('DISCORD_TOKEN: abcde...efg');
    });

    test('should redact a token when key is lowercase', () => {
        const result = redactSensitiveInfo('discord_token', 'abcdefg1234567890abcdefg');
        expect(result).toBe('discord_token: abcde...efg');
    });

    test('should redact a value containing "Bearer"', () => {
        const result = redactSensitiveInfo('Authorization', 'Bearer abcdefg1234567890abcdefg');
        expect(result).toBe('Authorization: Bea...efg');
    });

    test('should not redact non-sensitive data', () => {
        const result = redactSensitiveInfo('username', 'notSensitive');
        expect(result).toBe('username: notSensitive');
    });

    test('should handle null or undefined values', () => {
        const result = redactSensitiveInfo('some_key', null);
        expect(result).toBe('some_key: [Value is null or undefined]');
    });

    test('should handle complex values that cannot be stringified', () => {
        const circularReference = {};
        circularReference.self = circularReference;
        const result = redactSensitiveInfo('complexKey', circularReference);
        expect(result).toBe('complexKey: [Complex value cannot be stringified]');
    });

    test('should redact based on key case-insensitively', () => {
        const result = redactSensitiveInfo('ApI_KeY', 'supersecretapikey');
        expect(result).toBe('ApI_KeY: super...key');
    });
});
