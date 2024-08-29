// Import necessary modules
import { redactSensitiveInfo } from './redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
    test('should redact sensitive information based on key', () => {
        expect(redactSensitiveInfo('password', 'mySecretPassword')).toBe('password: mySec...word');
        expect(redactSensitiveInfo('apiKey', '1234567890abcdef')).toBe('apiKey: 12345...bcdef');
        expect(redactSensitiveInfo('auth_token', 'abcdef123456')).toBe('auth_token: abcde...23456');
    });

    test('should redact sensitive information based on value', () => {
        expect(redactSensitiveInfo('Authorization', 'Bearer mySecretToken')).toBe('Authorization: Beare...Token');
        expect(redactSensitiveInfo('Authorization', 'Token mySecretToken')).toBe('Authorization: Toke...Token');
    });

    test('should handle non-string values', () => {
        expect(redactSensitiveInfo('nonSensitive', 12345)).toBe('nonSensitive: 12345');
        expect(redactSensitiveInfo('nonSensitive', true)).toBe('nonSensitive: true');
        expect(redactSensitiveInfo('nonSensitive', { key: 'value' })).toBe('nonSensitive: {"key":"value"}');
    });

    test('should handle null or undefined values', () => {
        expect(redactSensitiveInfo('key', null)).toBe('key: [Value is null or undefined]');
        expect(redactSensitiveInfo('key', undefined)).toBe('key: [Value is null or undefined]');
    });

    test('should handle circular references in objects', () => {
        interface CircularReference {
            self?: CircularReference;
        }

        const circularReference: CircularReference = {};
        circularReference.self = circularReference;

        expect(redactSensitiveInfo('circular', circularReference)).toBe('circular: [Complex value cannot be stringified]');
    });
});
