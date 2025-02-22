const redactFn = require('@common/redactSensitiveInfo');

describe('redactSensitiveInfo', () => {
  it('should redact sensitive keys in key-value pairs', () => {
    expect(redactFn('password', 'mySecretPassword')).toBe('password: mySec...sword');
    expect(redactFn('apiKey', '1234567890abcdef')).toBe('apiKey: 12345...bcdef');
    expect(redactFn('auth_token', 'abcdef123456')).toBe('auth_token: abcde...23456');
  });

  it('should handle non-sensitive keys normally', () => {
    expect(redactFn('username', 'john_doe')).toBe('username: john_doe');
  });

  it('should handle non-string values', () => {
    expect(redactFn('data', { key: 'value' })).toBe('data: [Object]');
  });
});
