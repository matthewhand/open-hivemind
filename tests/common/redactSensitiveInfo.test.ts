import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
  it('should redact sensitive keys in key-value pairs', () => {
    expect(redactSensitiveInfo('password', 'mySecretPassword')).toBe('********');
    expect(redactSensitiveInfo('apiKey', '1234567890abcdef')).toBe('********');
    expect(redactSensitiveInfo('auth_token', 'abcdef123456')).toBe('********');
  });

  it('should handle non-sensitive keys normally', () => {
    expect(redactSensitiveInfo('username', 'john_doe')).toBe('john_doe');
  });

  it('should handle non-string values', () => {
    expect(redactSensitiveInfo('data', { key: 'value' })).toBe('[object Object]');
  });
});
