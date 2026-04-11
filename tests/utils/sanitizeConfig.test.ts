import { sanitizeConfig, sanitizeProfiles } from '../../src/server/utils/sanitizeConfig';

describe('sanitizeConfig', () => {
  it('masks apiKey field', () => {
    const result = sanitizeConfig({ apiKey: 'sk-real-key-12345' });
    expect(result.apiKey).toBe('••••••••');
    expect(result.apiKey).not.toContain('sk-real');
  });

  it('masks all sensitive key variants', () => {
    const config = {
      apiKey: 'key1',
      api_key: 'key2',
      password: 'pass',
      secret: 'sec',
      token: 'tok',
      clientSecret: 'cs',
      privateKey: 'pk',
      webhookSecret: 'ws',
    };
    const result = sanitizeConfig(config);
    Object.values(result).forEach(v => expect(v).toBe('••••••••'));
  });

  it('preserves non-sensitive fields', () => {
    const result = sanitizeConfig({ model: 'gpt-4', baseUrl: 'https://api.openai.com', maxTokens: 1000 });
    expect(result.model).toBe('gpt-4');
    expect(result.baseUrl).toBe('https://api.openai.com');
    expect(result.maxTokens).toBe(1000);
  });

  it('does not mask empty string values', () => {
    const result = sanitizeConfig({ apiKey: '' });
    expect(result.apiKey).toBe('');
  });

  it('recurses into nested objects', () => {
    const result = sanitizeConfig({ provider: { apiKey: 'secret', name: 'openai' } });
    expect((result.provider as any).apiKey).toBe('••••••••');
    expect((result.provider as any).name).toBe('openai');
  });

  it('passes through arrays unchanged', () => {
    const result = sanitizeConfig({ tags: ['a', 'b'], apiKey: 'secret' });
    expect(result.tags).toEqual(['a', 'b']);
    expect(result.apiKey).toBe('••••••••');
  });

  it('passes through null values unchanged', () => {
    const result = sanitizeConfig({ apiKey: null as any, model: null as any });
    expect(result.apiKey).toBeNull();
    expect(result.model).toBeNull();
  });

  it('passes through numeric and boolean non-sensitive fields', () => {
    const result = sanitizeConfig({ timeout: 3000, enabled: true });
    expect(result.timeout).toBe(3000);
    expect(result.enabled).toBe(true);
  });
});

describe('sanitizeProfiles', () => {
  it('sanitizes config on each profile', () => {
    const profiles = [
      { key: 'p1', name: 'Profile 1', config: { apiKey: 'secret', model: 'gpt-4' } },
      { key: 'p2', name: 'Profile 2', config: { baseUrl: 'http://example.com' } },
    ];
    const result = sanitizeProfiles(profiles);
    expect(result[0].config.apiKey).toBe('••••••••');
    expect(result[0].config.model).toBe('gpt-4');
    expect(result[1].config.baseUrl).toBe('http://example.com');
  });

  it('handles profiles with no config', () => {
    const profiles = [{ key: 'p1', name: 'Profile 1' }];
    expect(() => sanitizeProfiles(profiles)).not.toThrow();
  });

  it('preserves non-config profile fields', () => {
    const profiles = [
      { key: 'p1', name: 'Profile 1', config: { apiKey: 'secret' } },
    ];
    const result = sanitizeProfiles(profiles);
    expect(result[0].key).toBe('p1');
    expect(result[0].name).toBe('Profile 1');
  });

  it('returns an empty array when given an empty array', () => {
    expect(sanitizeProfiles([])).toEqual([]);
  });
});
