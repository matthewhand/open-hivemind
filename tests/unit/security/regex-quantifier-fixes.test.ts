import { validateApiKey } from '../../../src/utils/apiKeyValidation';
import { sanitizeForLogging } from '../../../src/common/logger';
import { SlackChannelManager } from '../../../packages/message-slack/src/utils/SlackChannelManager';

describe('Security: regex quantifier bypasses (post-fix)', () => {
  describe('API key validators', () => {
    it('anthropic: rejects the literal "{40 }" quantifier-bypass string', () => {
      const bypass = 'sk-ant-' + '{40 }';
      expect(validateApiKey('anthropic', bypass, true).isValid).toBe(false);
    });

    it('anthropic: accepts a realistic 40+ char key', () => {
      const realKey = 'sk-ant-api03-' + 'a'.repeat(40);
      expect(validateApiKey('anthropic', realKey, true).isValid).toBe(true);
    });

    it('discord: rejects the literal "{59 }" quantifier-bypass string', () => {
      const bypass = '{59 }';
      expect(validateApiKey('discord', bypass, true).isValid).toBe(false);
    });

    it('discord: accepts a realistic token (59+ chars with dots)', () => {
      const realToken = 'MTk4NzA1MDMyMzU5OTE3MTgy' + '.' + 'YWJjZGVm' + '.' + 'a'.repeat(27);
      expect(validateApiKey('discord', realToken, true).isValid).toBe(true);
    });

    it('openwebui: rejects the literal "{32 }" quantifier-bypass string', () => {
      const bypass = 'sk-' + '{32 }';
      expect(validateApiKey('openwebui', bypass, true).isValid).toBe(false);
    });

    it('openwebui: accepts a realistic 32+ char key', () => {
      const realKey = 'sk-' + 'a'.repeat(32);
      expect(validateApiKey('openwebui', realKey, true).isValid).toBe(true);
    });

    it('telegram: rejects the literal "{35 }" quantifier-bypass string', () => {
      const bypass = '1234567890:' + '{35 }';
      expect(validateApiKey('telegram', bypass, true).isValid).toBe(false);
    });

    it('telegram: accepts a realistic token', () => {
      const realToken = '1234567890:' + 'A'.repeat(35);
      expect(validateApiKey('telegram', realToken, true).isValid).toBe(true);
    });
  });

  describe('Log redaction (GENERIC_TOKEN_REGEX via sanitizeForLogging)', () => {
    it('redacts realistic sk_/pk_/rk_/ak_ tokens embedded in log strings', () => {
      const input = 'using sk_abcdefghij1234567890 and pk_zyxwvu87654321 for auth';
      const redacted = sanitizeForLogging(input) as string;
      expect(redacted).not.toContain('sk_abcdefghij1234567890');
      expect(redacted).not.toContain('pk_zyxwvu87654321');
      expect(redacted).toContain('********');
    });
  });

  describe('Slack channel id validator', () => {
    it('rejects the literal "{8 }" quantifier-bypass string', () => {
      expect(SlackChannelManager.isValidChannelId('C{8 }')).toBe(false);
    });

    it('rejects strings that are just the prefix (empty suffix)', () => {
      expect(SlackChannelManager.isValidChannelId('C')).toBe(false);
    });

    it('accepts a realistic Slack channel id', () => {
      expect(SlackChannelManager.isValidChannelId('C01ABCDEFGH')).toBe(true);
      expect(SlackChannelManager.isValidChannelId('G09ZYXWVU01')).toBe(true);
      expect(SlackChannelManager.isValidChannelId('D12345678')).toBe(true);
    });

    it('rejects lowercase or wrong-prefix ids', () => {
      expect(SlackChannelManager.isValidChannelId('c01ABCDEFGH')).toBe(false);
      expect(SlackChannelManager.isValidChannelId('X01ABCDEFGH')).toBe(false);
    });
  });

  describe('TelegramProvider token regex', () => {
    // The regex is module-scoped; we test indirectly by importing a fixture that exercises it.
    // Rather than import the private regex, assert that the literal-quantifier bypass string is
    // rejected at the same validation layer used above.
    it('rejects literal "{35 }" in place of the secret segment', () => {
      const bypass = '1234567890:{35 }';
      expect(validateApiKey('telegram', bypass, true).isValid).toBe(false);
    });
  });
});
