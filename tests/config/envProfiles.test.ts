import {
  envFieldToCamel,
  getEnvProfiles,
  hasEnvMessageProfileForProvider,
  resetEnvProfilesCache,
} from '../../src/config/envProfiles';

describe('envProfiles parser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Remove any leaked profile vars so the suite is hermetic.
    for (const key of Object.keys(process.env)) {
      if (/^(LLM|MESSAGE|MEMORY)_PROFILE_/.test(key)) {
        delete process.env[key];
      }
    }
    resetEnvProfilesCache();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetEnvProfilesCache();
  });

  describe('envFieldToCamel', () => {
    it('converts SCREAMING_SNAKE to camelCase', () => {
      expect(envFieldToCamel('BOT_TOKEN')).toBe('botToken');
      expect(envFieldToCamel('API_KEY')).toBe('apiKey');
      expect(envFieldToCamel('SIGNING_SECRET')).toBe('signingSecret');
      expect(envFieldToCamel('SOCKET_MODE')).toBe('socketMode');
      expect(envFieldToCamel('TOKEN')).toBe('token');
      expect(envFieldToCamel('API_BASE_URL')).toBe('apiBaseUrl');
    });
  });

  it('parses a message profile with camelCased config fields', () => {
    process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
    process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'tok-123';
    process.env.MESSAGE_PROFILE_DISCOMAIN_CHANNEL_ID = '42';
    resetEnvProfilesCache();

    const profiles = getEnvProfiles('message');
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      key: 'discomain',
      name: 'discomain',
      provider: 'discord',
      source: 'env',
      config: { botToken: 'tok-123', channelId: '42' },
    });
  });

  it('honors reserved NAME and DESCRIPTION fields', () => {
    process.env.MESSAGE_PROFILE_SLACKMAIN_PROVIDER = 'slack';
    process.env.MESSAGE_PROFILE_SLACKMAIN_NAME = 'Main Slack';
    process.env.MESSAGE_PROFILE_SLACKMAIN_DESCRIPTION = 'Primary workspace';
    process.env.MESSAGE_PROFILE_SLACKMAIN_BOT_TOKEN = 'xoxb-1';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('message');
    expect(profile.name).toBe('Main Slack');
    expect(profile.description).toBe('Primary workspace');
    expect(profile.config).not.toHaveProperty('name');
    expect(profile.config).not.toHaveProperty('description');
  });

  it('lowercases the profile key and provider', () => {
    process.env.LLM_PROFILE_GPT4MAIN_PROVIDER = 'OpenAI';
    process.env.LLM_PROFILE_GPT4MAIN_API_KEY = 'sk-1';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('llm');
    expect(profile.key).toBe('gpt4main');
    expect(profile.provider).toBe('openai');
  });

  it('lifts LLM MODEL_TYPE out of config into modelType', () => {
    process.env.LLM_PROFILE_EMB_PROVIDER = 'openai';
    process.env.LLM_PROFILE_EMB_MODEL_TYPE = 'embedding';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('llm');
    expect(profile.modelType).toBe('embedding');
    expect(profile.config).not.toHaveProperty('modelType');
  });

  it('keeps MODEL_TYPE as a config field for non-LLM profiles', () => {
    process.env.MEMORY_PROFILE_MEM1_PROVIDER = 'mem0';
    process.env.MEMORY_PROFILE_MEM1_MODEL_TYPE = 'whatever';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('memory');
    expect(profile.modelType).toBeUndefined();
    expect(profile.config.modelType).toBe('whatever');
  });

  it('coerces true/false strings to booleans', () => {
    process.env.MESSAGE_PROFILE_SLACKMAIN_PROVIDER = 'slack';
    process.env.MESSAGE_PROFILE_SLACKMAIN_SOCKET_MODE = 'true';
    process.env.MESSAGE_PROFILE_SLACKMAIN_OTHER_FLAG = 'FALSE';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('message');
    expect(profile.config.socketMode).toBe(true);
    expect(profile.config.otherFlag).toBe(false);
  });

  it('skips empty values', () => {
    process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
    process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = '   ';
    resetEnvProfilesCache();

    const [profile] = getEnvProfiles('message');
    expect(profile.config).not.toHaveProperty('botToken');
  });

  it('skips groups missing PROVIDER', () => {
    process.env.MESSAGE_PROFILE_NOPROV_BOT_TOKEN = 'tok';
    resetEnvProfilesCache();

    expect(getEnvProfiles('message')).toHaveLength(0);
  });

  it('does not match keys with underscores in the profile key', () => {
    // KEY may not contain underscores: extra segments are parsed as field parts.
    process.env.MESSAGE_PROFILE_MY_BOT_PROVIDER = 'discord';
    resetEnvProfilesCache();

    // 'MY' becomes the key with field 'BOT_PROVIDER' — no PROVIDER, so skipped.
    expect(getEnvProfiles('message')).toHaveLength(0);
  });

  it('separates profiles by type', () => {
    process.env.LLM_PROFILE_ALPHA_PROVIDER = 'openai';
    process.env.MESSAGE_PROFILE_ALPHA_PROVIDER = 'discord';
    process.env.MESSAGE_PROFILE_ALPHA_BOT_TOKEN = 't';
    process.env.MEMORY_PROFILE_ALPHA_PROVIDER = 'mem0';
    resetEnvProfilesCache();

    expect(getEnvProfiles('llm')).toHaveLength(1);
    expect(getEnvProfiles('message')).toHaveLength(1);
    expect(getEnvProfiles('memory')).toHaveLength(1);
  });

  it('caches until resetEnvProfilesCache is called', () => {
    process.env.MESSAGE_PROFILE_ONE_PROVIDER = 'discord';
    resetEnvProfilesCache();
    expect(getEnvProfiles('message')).toHaveLength(1);

    process.env.MESSAGE_PROFILE_TWO_PROVIDER = 'slack';
    // Still cached
    expect(getEnvProfiles('message')).toHaveLength(1);

    resetEnvProfilesCache();
    expect(getEnvProfiles('message')).toHaveLength(2);
  });

  describe('hasEnvMessageProfileForProvider', () => {
    it('returns true when a profile exists with botToken', () => {
      process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'tok-123';
      resetEnvProfilesCache();

      expect(hasEnvMessageProfileForProvider('discord')).toBe(true);
      expect(hasEnvMessageProfileForProvider('Discord')).toBe(true); // case-insensitive
      expect(hasEnvMessageProfileForProvider('slack')).toBe(false);
    });

    it('returns true when a profile exists with token (alias)', () => {
      process.env.MESSAGE_PROFILE_MATT_PROVIDER = 'mattermost';
      process.env.MESSAGE_PROFILE_MATT_TOKEN = 'mmost-tok';
      resetEnvProfilesCache();

      expect(hasEnvMessageProfileForProvider('mattermost')).toBe(true);
    });

    it('returns false when token is empty', () => {
      process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = '   ';
      resetEnvProfilesCache();

      expect(hasEnvMessageProfileForProvider('discord')).toBe(false);
    });

    it('returns false when no profiles exist', () => {
      resetEnvProfilesCache();

      expect(hasEnvMessageProfileForProvider('discord')).toBe(false);
      expect(hasEnvMessageProfileForProvider('slack')).toBe(false);
    });
  });
});
