/**
 * End-to-end: a bot configured purely via env-defined message profile.
 *
 *   MESSAGE_PROFILE_DISCOMAIN_PROVIDER=discord
 *   MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN=...
 *   BOTS_HIVE1_MESSAGE_PROFILE=discomain
 */

import { createBotConfig } from '../../src/config/botConfigFactory';
import { discoverBotNamesFromEnv } from '../../src/config/botDiscovery';
import { resetEnvProfilesCache } from '../../src/config/envProfiles';

const stubCache = {
  get: () => undefined,
  set: () => undefined,
} as never;

const stubUserConfigStore = {
  getBotOverride: () => undefined,
} as never;

describe('createBotConfig with BOTS_<NAME>_MESSAGE_PROFILE', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const key of Object.keys(process.env)) {
      if (/^(LLM|MESSAGE|MEMORY)_PROFILE_/.test(key) || key.startsWith('BOTS_HIVE1_')) {
        delete process.env[key];
      }
    }
    resetEnvProfilesCache();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetEnvProfilesCache();
  });

  it('is discovered from BOTS_HIVE1_MESSAGE_PROFILE alone', () => {
    process.env.BOTS_HIVE1_MESSAGE_PROFILE = 'discomain';
    expect(discoverBotNamesFromEnv()).toContain('hive1');
  });

  it('resolves discord credentials from the env-defined message profile', () => {
    process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
    process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'env-disco-token';
    process.env.MESSAGE_PROFILE_DISCOMAIN_CHANNEL_ID = '12345';
    process.env.BOTS_HIVE1_MESSAGE_PROFILE = 'discomain';
    resetEnvProfilesCache();

    const config = createBotConfig('hive1', [], stubCache, stubUserConfigStore);
    expect(config).not.toBeNull();
    expect(config!.messageProvider).toBe('discord');
    expect(config!.messageProfile).toBe('discomain');
    expect(config!.discord?.token).toBe('env-disco-token');
    expect(config!.discord?.channelId).toBe('12345');
  });

  it('adopts the profile provider when MESSAGE_PROVIDER is not explicitly set', () => {
    process.env.MESSAGE_PROFILE_SLACKMAIN_PROVIDER = 'slack';
    process.env.MESSAGE_PROFILE_SLACKMAIN_BOT_TOKEN = 'xoxb-env';
    process.env.MESSAGE_PROFILE_SLACKMAIN_APP_TOKEN = 'xapp-env';
    process.env.BOTS_HIVE1_MESSAGE_PROFILE = 'slackmain';
    resetEnvProfilesCache();

    const config = createBotConfig('hive1', [], stubCache, stubUserConfigStore);
    expect(config!.messageProvider).toBe('slack');
    expect(config!.slack?.botToken).toBe('xoxb-env');
    expect(config!.slack?.appToken).toBe('xapp-env');
  });

  it('skips the profile when MESSAGE_PROVIDER is explicitly different', () => {
    process.env.MESSAGE_PROFILE_SLACKMAIN_PROVIDER = 'slack';
    process.env.MESSAGE_PROFILE_SLACKMAIN_BOT_TOKEN = 'xoxb-env';
    process.env.BOTS_HIVE1_MESSAGE_PROFILE = 'slackmain';
    process.env.BOTS_HIVE1_MESSAGE_PROVIDER = 'discord';
    resetEnvProfilesCache();

    const config = createBotConfig('hive1', [], stubCache, stubUserConfigStore);
    expect(config!.messageProvider).toBe('discord');
    expect(config!.slack).toBeUndefined();
  });

  it('explicit BOTS_* credentials win over profile values', () => {
    process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
    process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'profile-token';
    process.env.MESSAGE_PROFILE_DISCOMAIN_CHANNEL_ID = 'profile-channel';
    process.env.BOTS_HIVE1_MESSAGE_PROFILE = 'discomain';
    process.env.BOTS_HIVE1_DISCORD_BOT_TOKEN = 'explicit-token';
    resetEnvProfilesCache();

    const config = createBotConfig('hive1', [], stubCache, stubUserConfigStore);
    expect(config!.discord?.token).toBe('explicit-token');
    // Profile still fills gaps
    expect(config!.discord?.channelId).toBe('profile-channel');
  });
});
