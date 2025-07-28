import { redactSensitiveInfo } from '../../src/common/redactSensitiveInfo';
import { expect } from 'chai';

describe('redactSensitiveInfo', () => {
  it('should redact known sensitive keys', () => {
    expect(redactSensitiveInfo('password', 'secret123')).to.equal('********');
    expect(redactSensitiveInfo('APIKEY', 'abc123')).to.equal('********');
    expect(redactSensitiveInfo('Auth_Token', 'token123')).to.equal('********');
  });

  it('should not redact non-sensitive keys', () => {
    expect(redactSensitiveInfo('username', 'admin')).to.equal('admin');
    expect(redactSensitiveInfo('email', 'user@example.com')).to.equal('user@example.com');
  });

  it('should handle non-string values', () => {
    expect(redactSensitiveInfo('number', 123)).to.equal('123');
    expect(redactSensitiveInfo('boolean', true)).to.equal('true');
    expect(redactSensitiveInfo('object', { key: 'value' })).to.equal('[object Object]');
  });

  it('should redact on error during processing', () => {
    // Test error case by passing invalid input
    const result = redactSensitiveInfo('password', { toString: () => { throw new Error('test error') } });
    expect(result).to.equal('********');
  });
});
