"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import necessary modules
const redactSensitiveInfo_1 = require("./redactSensitiveInfo");
describe('redactSensitiveInfo', () => {
    test('should redact sensitive information based on key', () => {
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('password', 'mySecretPassword')).toBe('password: mySec...word');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('apiKey', '1234567890abcdef')).toBe('apiKey: 12345...bcdef');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('auth_token', 'abcdef123456')).toBe('auth_token: abcde...23456');
    });
    test('should redact sensitive information based on value', () => {
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('Authorization', 'Bearer mySecretToken')).toBe('Authorization: Beare...Token');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('Authorization', 'Token mySecretToken')).toBe('Authorization: Toke...Token');
    });
    test('should handle non-string values', () => {
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('nonSensitive', 12345)).toBe('nonSensitive: 12345');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('nonSensitive', true)).toBe('nonSensitive: true');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('nonSensitive', { key: 'value' })).toBe('nonSensitive: {"key":"value"}');
    });
    test('should handle null or undefined values', () => {
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('key', null)).toBe('key: [Value is null or undefined]');
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('key', undefined)).toBe('key: [Value is null or undefined]');
    });
    test('should handle circular references in objects', () => {
        const circularReference = {};
        circularReference.self = circularReference;
        expect((0, redactSensitiveInfo_1.redactSensitiveInfo)('circular', circularReference)).toBe('circular: [Complex value cannot be stringified]');
    });
});
