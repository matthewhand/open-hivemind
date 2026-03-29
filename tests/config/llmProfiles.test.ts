jest.mock('fs', () => {
  const fsMock = {
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
  return {
    __esModule: true,
    default: fsMock,
    ...fsMock,
  };
});

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../src/config/llmConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

import * as fs from 'fs';
import llmConfig from '../../src/config/llmConfig';
import { UserConfigStore } from '../../src/config/UserConfigStore';

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedUserConfigStore = UserConfigStore as jest.Mocked<typeof UserConfigStore>;
const mockedLlmConfigGet = (llmConfig as any).get as jest.Mock;

const profilesJson = JSON.stringify({
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
});

function setupMocks() {
  mockedFs.existsSync.mockReturnValue(true);
  mockedFs.readFileSync.mockReturnValue(profilesJson);
  mockedUserConfigStore.getInstance.mockReturnValue({
    getGeneralSettings: () => ({
      defaultEmbeddingProfile: 'embed-openai',
    }),
  } as any);
  mockedLlmConfigGet.mockReturnValue('');
}

describe('llmProfiles embedding helpers', () => {
  test('normalizes unknown model types to chat', () => {
    setupMocks();
    jest.isolateModules(() => {
      const { normalizeModelType } = require('../../src/config/llmProfiles');
      expect(normalizeModelType('search')).toBe('chat');
      expect(normalizeModelType(undefined)).toBe('chat');
    });
  });

  test('returns the default embedding profile key from user settings', () => {
    setupMocks();
    jest.isolateModules(() => {
      const { getDefaultEmbeddingProfileKey } = require('../../src/config/llmProfiles');
      expect(getDefaultEmbeddingProfileKey()).toBe('embed-openai');
    });
  });

  test('prefers DEFAULT_EMBEDDING_PROVIDER from llm config when present', () => {
    setupMocks();
    mockedLlmConfigGet.mockReturnValue('hybrid-openai');
    jest.isolateModules(() => {
      const { getDefaultEmbeddingProfileKey } = require('../../src/config/llmProfiles');
      expect(getDefaultEmbeddingProfileKey()).toBe('hybrid-openai');
    });
  });

  test('returns only embedding-capable profiles', () => {
    setupMocks();
    jest.isolateModules(() => {
      const { getEmbeddingProfileByKey } = require('../../src/config/llmProfiles');
      expect(getEmbeddingProfileByKey('embed-openai')?.key).toBe('embed-openai');
      expect(getEmbeddingProfileByKey('hybrid-openai')?.key).toBe('hybrid-openai');
      expect(getEmbeddingProfileByKey('chat-openai')).toBeUndefined();
    });
  });

  test('resolves an explicit embedding profile key', () => {
    setupMocks();
    jest.isolateModules(() => {
      const { resolveEmbeddingProfileKey } = require('../../src/config/llmProfiles');
      expect(resolveEmbeddingProfileKey('hybrid-openai')).toBe('hybrid-openai');
      expect(resolveEmbeddingProfileKey('chat-openai')).toBeUndefined();
    });
  });

  test('falls back to the default embedding profile key', () => {
    setupMocks();
    jest.isolateModules(() => {
      const { resolveEmbeddingProfileKey } = require('../../src/config/llmProfiles');
      expect(resolveEmbeddingProfileKey()).toBe('embed-openai');
    });
  });
});
