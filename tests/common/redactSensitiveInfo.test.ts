import { redactSensitiveInfo } from '../../src/common/redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
  it('should redact known sensitive keys', () => {
    expect(redactSensitiveInfo('password', 'secret123')).toBe('********');
    expect(redactSensitiveInfo('apikey', 'abc123')).toBe('********');
    expect(redactSensitiveInfo('auth_token', 'token123')).toBe('********');
  });

  it('should not redact non-sensitive keys', () => {
    expect(redactSensitiveInfo('username', 'admin')).toBe('admin');
    expect(redactSensitiveInfo('email', 'user@example.com')).toBe('user@example.com');
  });

  it('should handle non-string values', () => {
    expect(redactSensitiveInfo('number', 123)).toBe('123');
    expect(redactSensitiveInfo('boolean', true)).toBe('true');
    expect(redactSensitiveInfo('object', { key: 'value' })).toBe('[object Object]');
  });
});
