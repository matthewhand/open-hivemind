import { loadProfiles, findProfileByKey } from '../../src/config/profileUtils';
import { UserConfigStore } from '../../src/config/UserConfigStore';
import llmConfig from '../../src/config/llmConfig';

jest.mock('../../src/config/profileUtils', () => {
  return {
    loadProfiles: jest.fn(),
    findProfileByKey: jest.requireActual('../../src/config/profileUtils').findProfileByKey,
    saveProfiles: jest.fn()
  }
});

jest.mock('../../src/config/UserConfigStore', () => {
  return {
    UserConfigStore: {
      getInstance: jest.fn().mockReturnValue({
        getGeneralSettings: jest.fn().mockReturnValue({
          defaultEmbeddingProfile: 'embed-openai'
        })
      }),
    },
  };
});

// Since config/llmProfiles caches the profile we need to re-require it
let getDefaultEmbeddingProfileKey: any;
let getEmbeddingProfileByKey: any;
let normalizeModelType: any;
let resolveEmbeddingProfileKey: any;

describe('llmProfiles embedding helpers', () => {
  const mockProfilesData = {
    llm: [
      {
        key: 'chat-openai',
        name: 'Chat OpenAI',
        provider: 'openai',
        modelType: 'chat' as any,
        config: { model: 'gpt-4o' },
      },
      {
        key: 'embed-openai',
        name: 'Embedding OpenAI',
        provider: 'openai',
        modelType: 'embedding' as any,
        config: { model: 'text-embedding-3-large' },
      },
      {
        key: 'hybrid-openai',
        name: 'Hybrid OpenAI',
        provider: 'openai',
        modelType: 'both' as any,
        config: { model: 'gpt-4.1-mini' },
      },
    ],
  };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    process.env = { ...originalEnv };

    const utils = require('../../src/config/profileUtils');
    utils.loadProfiles.mockReturnValue(mockProfilesData);
    utils.loadProfiles.mockImplementation((options: any) => {
        if (options && options.validateAndMigrate) {
          return options.validateAndMigrate(mockProfilesData);
        }
        return mockProfilesData;
    });

    const store = require('../../src/config/UserConfigStore');
    store.UserConfigStore.getInstance.mockReturnValue({
      getGeneralSettings: () => ({
        defaultEmbeddingProfile: 'embed-openai',
      }),
    });

    delete process.env.DEFAULT_EMBEDDING_PROVIDER;
    const config = require('../../src/config/llmConfig').default;
    config.load({ DEFAULT_EMBEDDING_PROVIDER: '' });

    const mod = require('../../src/config/llmProfiles');
    getDefaultEmbeddingProfileKey = mod.getDefaultEmbeddingProfileKey;
    getEmbeddingProfileByKey = mod.getEmbeddingProfileByKey;
    normalizeModelType = mod.normalizeModelType;
    resolveEmbeddingProfileKey = mod.resolveEmbeddingProfileKey;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('normalizes unknown model types to chat', () => {
    expect(normalizeModelType('search')).toBe('chat');
    expect(normalizeModelType(undefined)).toBe('chat');
  });

  test('returns the default embedding profile key from user settings', () => {
    expect(getDefaultEmbeddingProfileKey()).toBe('embed-openai');
  });

  test('prefers DEFAULT_EMBEDDING_PROVIDER from llm config when present', () => {
    process.env.DEFAULT_EMBEDDING_PROVIDER = 'hybrid-openai';
    const config = require('../../src/config/llmConfig').default;
    config.load({ DEFAULT_EMBEDDING_PROVIDER: 'hybrid-openai' });

    expect(getDefaultEmbeddingProfileKey()).toBe('hybrid-openai');
  });

  test('returns only embedding-capable profiles', () => {
    expect(getEmbeddingProfileByKey('embed-openai')?.key).toBe('embed-openai');
    expect(getEmbeddingProfileByKey('hybrid-openai')?.key).toBe('hybrid-openai');
    expect(getEmbeddingProfileByKey('chat-openai')).toBeUndefined();
  });

  test('resolves an explicit embedding profile key', () => {
    expect(resolveEmbeddingProfileKey('hybrid-openai')).toBe('hybrid-openai');
    expect(resolveEmbeddingProfileKey('chat-openai')).toBeUndefined();
  });

  test('falls back to the default embedding profile key', () => {
    expect(resolveEmbeddingProfileKey()).toBe('embed-openai');
  });
});
