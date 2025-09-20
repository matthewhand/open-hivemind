import { redactSensitiveInfo } from '../../src/common/redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
  const expectRedacted = (key: string, value: unknown) => {
    const result = redactSensitiveInfo(key, value);
    expect(result).toContain('*');

    if (value === undefined || value === null) {
      expect(result).toBe('********');
      return;
    }

    const stringValue = String(value);
    expect(result).not.toBe(stringValue);

    if (stringValue.length > 8) {
      expect(result.startsWith(stringValue.slice(0, 4))).toBe(true);
      expect(result.endsWith(stringValue.slice(-4))).toBe(true);
      const middle = result.slice(4, -4);
      expect(/^\*+$/.test(middle)).toBe(true);
      expect(middle.length).toBeGreaterThanOrEqual(4);
    } else {
      const visible = stringValue.slice(-4);
      expect(result.endsWith(visible)).toBe(true);
      const prefix = result.slice(0, result.length - visible.length);
      expect(/^\*+$/.test(prefix)).toBe(true);
      expect(prefix.length).toBeGreaterThanOrEqual(4);
    }
  };

  it('redacts known sensitive key patterns', () => {
    const inputs = [
      { key: 'password', value: 'secret123' },
      { key: 'API_KEY', value: 'abcd1234' },
      { key: 'auth_token', value: 'token123' },
      { key: 'client_secret', value: 'mysecret' },
      { key: 'private_key', value: 'key12345' },
    ];

    inputs.forEach(({ key, value }) => {
      expectRedacted(key, value);
    });
  });

  it('redacts short sensitive values with minimum masking', () => {
    const result = redactSensitiveInfo('password', 'abc');
    expect(result).toMatch(/^\*{4,}abc$/);
  });

  it('returns non-sensitive values unchanged', () => {
    expect(redactSensitiveInfo('username', 'admin')).toBe('admin');
    expect(redactSensitiveInfo('email', 'user@example.com')).toBe('user@example.com');
    expect(redactSensitiveInfo('host', 'localhost')).toBe('localhost');
  });

  it('handles numbers, booleans, and other primitives', () => {
    expectRedacted('password', 12345678);
    expect(redactSensitiveInfo('port', 8080)).toBe('8080');
    expectRedacted('token', true);
    expect(redactSensitiveInfo('enabled', false)).toBe('false');
  });

  it('handles null and undefined values safely', () => {
    expect(redactSensitiveInfo('password', null)).toBe('********');
    expect(redactSensitiveInfo('password', undefined)).toBe('********');
    expect(redactSensitiveInfo('username', null)).toBe('');
  });

  it('supports unicode values and mixed-case keys', () => {
    expectRedacted('Password', '密钥123456');
    expect(redactSensitiveInfo('用户名', 'admin')).toBe('admin');
  });

  it('is deterministic for repeated calls', () => {
    const key = 'password';
    const value = 'repeatSecret';
    const result1 = redactSensitiveInfo(key, value);
    const result2 = redactSensitiveInfo(key, value);
    expect(result1).toBe(result2);
  });
});
