import { describe, it, expect } from 'vitest';
import { deriveProviderStatus, hasCredential } from '../messageProviderStatus';

describe('hasCredential', () => {
  it('detects a token-like credential', () => {
    expect(hasCredential({ token: 'abc' })).toBe(true);
    expect(hasCredential({ botToken: 'abc' })).toBe(true);
    expect(hasCredential({ apiKey: 'abc' })).toBe(true);
  });

  it('treats redacted values as present', () => {
    // The API redacts secrets to bullet characters; the credential still exists.
    expect(hasCredential({ token: '••••••••' })).toBe(true);
  });

  it('returns false for empty / missing credentials', () => {
    expect(hasCredential({})).toBe(false);
    expect(hasCredential(undefined)).toBe(false);
    expect(hasCredential({ token: '   ' })).toBe(false);
    expect(hasCredential({ clientId: '123' })).toBe(false);
  });
});

describe('deriveProviderStatus', () => {
  const discordProfile = { provider: 'discord', config: { token: 'abc' } };

  it('reports Connected when a bot on the platform is connected', () => {
    const status = deriveProviderStatus(discordProfile, [
      { provider: 'discord', connected: true, status: 'active' },
    ]);
    expect(status.level).toBe('connected');
    expect(status.label).toBe('Connected');
  });

  it('ignores connected bots on other platforms', () => {
    const status = deriveProviderStatus(discordProfile, [
      { provider: 'slack', connected: true, status: 'active' },
    ]);
    expect(status.level).toBe('configured');
  });

  it('reports Error when a bot on the platform reports an error', () => {
    const status = deriveProviderStatus(discordProfile, [
      { provider: 'discord', connected: false, status: 'error' },
    ]);
    expect(status.level).toBe('error');
  });

  it('reports Configured when credentials exist but nothing is connected', () => {
    const status = deriveProviderStatus(discordProfile, []);
    expect(status.level).toBe('configured');
    expect(status.label).toBe('Configured');
  });

  it('reports Error when credentials are missing', () => {
    const status = deriveProviderStatus({ provider: 'discord', config: {} }, []);
    expect(status.level).toBe('error');
    expect(status.description).toMatch(/missing credentials/i);
  });

  it('matches on messageProvider field as well as provider', () => {
    const status = deriveProviderStatus(discordProfile, [
      { messageProvider: 'discord', connected: true },
    ]);
    expect(status.level).toBe('connected');
  });
});
