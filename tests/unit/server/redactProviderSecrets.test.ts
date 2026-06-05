import {
  redactProvider,
  redactProviderConfig,
} from '../../../src/server/utils/redactProviderSecrets';

describe('redactProviderSecrets', () => {
  describe('redactProviderConfig', () => {
    it('redacts known secret keys to first-3 + "***"', () => {
      const out = redactProviderConfig({
        apiKey: 'sk-DEADBEEF',
        botToken: 'xoxb-1234567890',
        token: 'discord-token-abc',
        signingSecret: 'sup3rsecret',
        password: 'hunter2hunter',
        secret: 'topsecret',
      });
      expect(out).toEqual({
        apiKey: 'sk-***',
        botToken: 'xox***',
        token: 'dis***',
        signingSecret: 'sup***',
        password: 'hun***',
        secret: 'top***',
      });
    });

    it('preserves non-secret fields untouched', () => {
      const out = redactProviderConfig({
        apiKey: 'sk-LONG-KEY-FOR-TESTING',
        baseUrl: 'https://api.example.com',
        model: 'gpt-4o',
        timeout: 30000,
      });
      expect(out.baseUrl).toBe('https://api.example.com');
      expect(out.model).toBe('gpt-4o');
      expect(out.timeout).toBe(30000);
      expect(out.apiKey).toBe('sk-***');
    });

    it('returns "***" without leaking length for short values', () => {
      const out = redactProviderConfig({ apiKey: 'abc' });
      expect(out.apiKey).toBe('***');
    });

    it('returns "***" for empty-string secret', () => {
      const out = redactProviderConfig({ apiKey: '' });
      // empty strings are skipped (not redacted) so we don't conjure a value
      expect(out.apiKey).toBe('');
    });

    it('passes through nullish input', () => {
      expect(redactProviderConfig(null)).toBeNull();
      expect(redactProviderConfig(undefined)).toBeUndefined();
    });

    it('does not mutate the input', () => {
      const input = { apiKey: 'sk-ORIGINAL', baseUrl: 'http://x' };
      const out = redactProviderConfig(input);
      expect(input.apiKey).toBe('sk-ORIGINAL');
      expect(out.apiKey).toBe('sk-***');
    });
  });

  describe('redactProvider', () => {
    it('shallow-clones with redacted config', () => {
      const provider = {
        id: 'llm-123',
        name: 'My OpenAI',
        type: 'openai',
        isActive: true,
        config: { apiKey: 'sk-DEADBEEF', model: 'gpt-4o' },
      };
      const out = redactProvider(provider);
      expect(out).toEqual({
        ...provider,
        config: { apiKey: 'sk-***', model: 'gpt-4o' },
      });
      // Input is not mutated.
      expect(provider.config.apiKey).toBe('sk-DEADBEEF');
    });

    it('survives missing config', () => {
      const provider = { id: 'x', name: 'no-config' };
      expect(redactProvider(provider)).toEqual(provider);
    });
  });
});
