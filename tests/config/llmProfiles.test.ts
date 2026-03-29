jest.mock('../../src/config/profileUtils', () => ({
  loadProfiles: jest.fn(),
  saveProfiles: jest.fn(),
  findProfileByKey: jest.fn(),
}));

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/config/llmConfig', () => ({
  get: jest.fn(),
}));

import llmConfig from '../../src/config/llmConfig';
import * as profileUtils from '../../src/config/profileUtils';
import { UserConfigStore } from '../../src/config/UserConfigStore';
import {
  getDefaultEmbeddingProfileKey,
  getEmbeddingProfileByKey,
  normalizeModelType,
  resolveEmbeddingProfileKey,
} from '../../src/config/llmProfiles';

const mockedUserConfigStore = UserConfigStore as jest.Mocked<typeof UserConfigStore>;
const mockedLlmConfig = llmConfig as jest.Mocked<typeof llmConfig>;

describe('llmProfiles embedding helpers', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    const mockProfiles = {
      llm: [
        {
          key: 'chat-openai',
          name: 'Chat OpenAI',
          provider: 'openai',
          modelType: 'chat',
          config: { model: 'gpt-4o' },
        },
        {
          key: 'embed-openai',
          name: 'Embedding OpenAI',
          provider: 'openai',
          modelType: 'embedding',
          config: { model: 'text-embedding-3-large' },
        },
        {
          key: 'hybrid-openai',
          name: 'Hybrid OpenAI',
          provider: 'openai',
          modelType: 'both',
          config: { model: 'gpt-4.1-mini' },
        },
      ],
    };
    (profileUtils.loadProfiles as jest.Mock).mockReturnValue(mockProfiles);
    (profileUtils.findProfileByKey as jest.Mock).mockImplementation((profiles, key, value) => {
      if (!profiles) return undefined;
      return profiles.find((p: any) => p[key] === value);
    });

    mockedUserConfigStore.getInstance.mockReturnValue({
      getGeneralSettings: () => ({
        defaultEmbeddingProfile: 'embed-openai',
      }),
    } as any);
    mockedLlmConfig.get.mockReturnValue('');
  });

  test('normalizes unknown model types to chat', () => {
    expect(normalizeModelType('search')).toBe('chat');
    expect(normalizeModelType(undefined)).toBe('chat');
  });

  test('returns the default embedding profile key from user settings', () => {
    expect(getDefaultEmbeddingProfileKey()).toBe('embed-openai');
  });

  test('prefers DEFAULT_EMBEDDING_PROVIDER from llm config when present', () => {
    mockedLlmConfig.get.mockReturnValue('hybrid-openai');

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
