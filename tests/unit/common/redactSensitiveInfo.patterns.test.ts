import { redactSensitiveInfo } from '../../../src/common/redactSensitiveInfo';

/**
 * Verifies the sensitive-key pattern list: newly-added cryptographic material
 * keys are redacted, while innocuous keys (which a too-broad substring like
 * 'iv' would have falsely matched) are left intact.
 */
describe('redactSensitiveInfo sensitive patterns', () => {
  const longValue = 'abcdefghijklmnopqrstuvwxyz0123456789';

  it.each([
    'signing_key',
    'encryption_key',
    'session_secret',
    'admin_password',
    'signature',
    'salt',
    'credential',
    // pre-existing patterns still covered
    'password',
    'api_key',
    'auth_token',
  ])('redacts the value for sensitive key "%s"', (key) => {
    const out = redactSensitiveInfo(key, longValue);
    expect(out).not.toBe(longValue);
    expect(out).toContain('*');
  });

  it.each([
    // These contain the substring "iv" — they must NOT be redacted now that
    // 'iv' was dropped from the pattern list.
    'active',
    'isActive',
    'archiveSettings',
    'privilegeLevel',
    'deliveryStatus',
    // unrelated innocuous keys
    'username',
    'displayName',
    'channelId',
  ])('does NOT redact the value for innocuous key "%s"', (key) => {
    expect(redactSensitiveInfo(key, longValue)).toBe(longValue);
  });
});
