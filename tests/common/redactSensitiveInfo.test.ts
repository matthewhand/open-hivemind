import { redactSensitiveInfo } from '../../src/common/redactSensitiveInfo';

describe('redactSensitiveInfo', () => {
  describe('Sensitive key detection', () => {
    it('should redact common password-related keys', () => {
      expect(redactSensitiveInfo('password', 'secret123')).toBe('********');
      expect(redactSensitiveInfo('PASSWORD', 'secret123')).toBe('********');
      expect(redactSensitiveInfo('user_password', 'secret123')).toBe('********');
      expect(redactSensitiveInfo('admin_password', 'secret123')).toBe('********');
      expect(redactSensitiveInfo('mypassword', 'secret123')).toBe('********');
    });

    it('should redact API key variations', () => {
      expect(redactSensitiveInfo('apikey', 'abc123')).toBe('********');
      expect(redactSensitiveInfo('api_key', 'abc123')).toBe('********');
      expect(redactSensitiveInfo('API_KEY', 'abc123')).toBe('********');
      expect(redactSensitiveInfo('apiKey', 'abc123')).toBe('********');
      expect(redactSensitiveInfo('client_api_key', 'abc123')).toBe('********');
    });

    it('should redact token variations', () => {
      expect(redactSensitiveInfo('token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('auth_token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('access_token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('refresh_token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('bearer_token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('jwt_token', 'token123')).toBe('********');
      expect(redactSensitiveInfo('TOKEN', 'token123')).toBe('********');
    });

    it('should redact secret variations', () => {
      expect(redactSensitiveInfo('secret', 'mysecret')).toBe('********');
      expect(redactSensitiveInfo('client_secret', 'mysecret')).toBe('********');
      expect(redactSensitiveInfo('app_secret', 'mysecret')).toBe('********');
      expect(redactSensitiveInfo('SECRET', 'mysecret')).toBe('********');
    });

    it('should redact key variations', () => {
      expect(redactSensitiveInfo('private_key', 'key123')).toBe('********');
      expect(redactSensitiveInfo('privateKey', 'key123')).toBe('********');
      expect(redactSensitiveInfo('encryption_key', 'key123')).toBe('********');
      expect(redactSensitiveInfo('KEY', 'key123')).toBe('********');
    });
  });

  describe('Non-sensitive key handling', () => {
    it('should not redact common non-sensitive keys', () => {
      expect(redactSensitiveInfo('username', 'admin')).toBe('admin');
      expect(redactSensitiveInfo('email', 'user@example.com')).toBe('user@example.com');
      expect(redactSensitiveInfo('name', 'John Doe')).toBe('John Doe');
      expect(redactSensitiveInfo('id', '12345')).toBe('12345');
      expect(redactSensitiveInfo('url', 'https://example.com')).toBe('https://example.com');
      expect(redactSensitiveInfo('host', 'localhost')).toBe('localhost');
      expect(redactSensitiveInfo('port', '8080')).toBe('8080');
    });

    it('should redact keys that contain sensitive words anywhere in the key name', () => {
      // The function uses includes() so any key containing sensitive patterns will be redacted
      expect(redactSensitiveInfo('password_reset_url', 'https://example.com/reset')).toBe('********');
      expect(redactSensitiveInfo('token_expiry', '3600')).toBe('********');
      expect(redactSensitiveInfo('secret_question', 'What is your favorite color?')).toBe('********');
    });
  });

  describe('Value type handling', () => {
    it('should handle string values correctly', () => {
      expect(redactSensitiveInfo('password', 'secret123')).toBe('********');
      expect(redactSensitiveInfo('username', 'admin')).toBe('admin');
      expect(redactSensitiveInfo('password', '')).toBe('********');
      expect(redactSensitiveInfo('username', '')).toBe('');
    });

    it('should handle numeric values', () => {
      expect(redactSensitiveInfo('password', 123)).toBe('********');
      expect(redactSensitiveInfo('port', 123)).toBe('123');
      expect(redactSensitiveInfo('password', 0)).toBe('********');
      expect(redactSensitiveInfo('count', 0)).toBe('0');
    });

    it('should handle boolean values', () => {
      expect(redactSensitiveInfo('password', true)).toBe('********');
      expect(redactSensitiveInfo('enabled', true)).toBe('true');
      expect(redactSensitiveInfo('password', false)).toBe('********');
      expect(redactSensitiveInfo('enabled', false)).toBe('false');
    });

    it('should handle object values', () => {
      const obj = { key: 'value' };
      expect(redactSensitiveInfo('password', obj)).toBe('********');
      expect(redactSensitiveInfo('config', obj)).toBe('[object Object]');
    });

    it('should handle array values', () => {
      const arr = [1, 2, 3];
      expect(redactSensitiveInfo('password', arr)).toBe('********');
      expect(redactSensitiveInfo('items', arr)).toBe('1,2,3');
    });

    it('should handle null and undefined values', () => {
      expect(redactSensitiveInfo('password', null)).toBe('********');
      expect(redactSensitiveInfo('username', null)).toBe('null');
      expect(redactSensitiveInfo('password', undefined)).toBe('********');
      expect(redactSensitiveInfo('username', undefined)).toBe('undefined');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty and whitespace keys', () => {
      expect(redactSensitiveInfo('', 'value')).toBe('value');
      expect(redactSensitiveInfo('   ', 'value')).toBe('value');
      expect(redactSensitiveInfo('\t\n', 'value')).toBe('value');
    });

    it('should handle special characters in keys', () => {
      expect(redactSensitiveInfo('password!', 'secret')).toBe('********');
      expect(redactSensitiveInfo('api-key', 'secret')).toBe('********');
      expect(redactSensitiveInfo('auth.token', 'secret')).toBe('********');
      expect(redactSensitiveInfo('user_name', 'admin')).toBe('admin');
    });

    it('should handle very long keys and values', () => {
      const longKey = 'a'.repeat(1000) + 'password';
      const longValue = 'x'.repeat(10000);
      expect(redactSensitiveInfo(longKey, longValue)).toBe('********');
      
      const longNonSensitiveKey = 'a'.repeat(1000) + 'username';
      expect(redactSensitiveInfo(longNonSensitiveKey, longValue)).toBe(longValue);
    });

    it('should handle unicode characters', () => {
      expect(redactSensitiveInfo('password', '密码123')).toBe('********');
      expect(redactSensitiveInfo('用户名', 'admin')).toBe('admin');
      // Unicode key names that don't contain English sensitive patterns won't be redacted
      expect(redactSensitiveInfo('пароль', 'secret')).toBe('secret');
      // But if they contain the English patterns, they will be redacted
      expect(redactSensitiveInfo('пароль_password', 'secret')).toBe('********');
    });

    it('should be case insensitive for key matching', () => {
      expect(redactSensitiveInfo('Password', 'secret')).toBe('********');
      expect(redactSensitiveInfo('PASSWORD', 'secret')).toBe('********');
      expect(redactSensitiveInfo('pAsSwOrD', 'secret')).toBe('********');
      expect(redactSensitiveInfo('Username', 'admin')).toBe('admin');
    });
  });

  describe('Performance', () => {
    it('should handle many redaction operations efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        redactSensitiveInfo('password', `secret${i}`);
        redactSensitiveInfo('username', `user${i}`);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete 2000 operations in under 1 second
    });

    it('should handle large values efficiently', () => {
      const largeValue = 'x'.repeat(100000);
      const startTime = Date.now();
      
      redactSensitiveInfo('password', largeValue);
      redactSensitiveInfo('username', largeValue);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should handle large values quickly
    });
  });

  describe('Consistency and reliability', () => {
    it('should return consistent results for same inputs', () => {
      const key = 'password';
      const value = 'secret123';
      
      const result1 = redactSensitiveInfo(key, value);
      const result2 = redactSensitiveInfo(key, value);
      const result3 = redactSensitiveInfo(key, value);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe('********');
    });

    it('should not modify input parameters', () => {
      const originalKey = 'password';
      const originalValue = 'secret123';
      const keyCopy = originalKey;
      const valueCopy = originalValue;
      
      redactSensitiveInfo(originalKey, originalValue);
      
      expect(originalKey).toBe(keyCopy);
      expect(originalValue).toBe(valueCopy);
    });
  });
});
