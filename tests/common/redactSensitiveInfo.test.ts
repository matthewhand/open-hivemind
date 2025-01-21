import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
  it('should redact sensitive keys in key-value pairs', () => {
    expect(redactSensitiveInfo('apiKey', 'secret-123')).toBe('apiKey: secre...t-123');
  });

  it('should handle non-sensitive keys normally', () => {
    expect(redactSensitiveInfo('username', 'john_doe')).toBe('username: john_doe');
  });

  it('should handle non-string values', () => {
    expect(redactSensitiveInfo('config', { timeout: 30 })).toMatch('config: {"timeout":30}');
  });
});