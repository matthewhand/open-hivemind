/**
 * Env-defined profiles overlay file profiles at read time (env wins by key)
 * and are stripped on save so env secrets never reach disk.
 */

jest.mock('../../src/config/profileUtils', () => {
  const actual = jest.requireActual('../../src/config/profileUtils');
  return {
    ...actual,
    loadProfiles: jest.fn(),
    saveProfiles: jest.fn(),
  };
});

import { loadProfiles, saveProfiles } from '../../src/config/profileUtils';
import { resetEnvProfilesCache } from '../../src/config/envProfiles';

const loadProfilesMock = loadProfiles as jest.Mock;
const saveProfilesMock = saveProfiles as jest.Mock;

describe('profile env overlay', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const key of Object.keys(process.env)) {
      if (/^(LLM|MESSAGE|MEMORY)_PROFILE_/.test(key)) {
        delete process.env[key];
      }
    }
    resetEnvProfilesCache();
    loadProfilesMock.mockReset();
    saveProfilesMock.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
    resetEnvProfilesCache();
  });

  describe('messageProfiles', () => {
    const { loadMessageProfiles, saveMessageProfiles, getMessageProfileByKey } =
      require('../../src/config/messageProfiles');

    it('merges env profiles over file profiles (env wins on key collision)', () => {
      loadProfilesMock.mockReturnValue({
        message: [
          { key: 'discomain', name: 'File Disco', provider: 'discord', config: { botToken: 'file-tok' } },
          { key: 'other', name: 'Other', provider: 'slack', config: {} },
        ],
      });
      process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'env-tok';
      resetEnvProfilesCache();

      const { message } = loadMessageProfiles();
      expect(message).toHaveLength(2);
      const disco = message.find((p: { key: string }) => p.key === 'discomain');
      expect(disco.source).toBe('env');
      expect(disco.config.botToken).toBe('env-tok');
      expect(message.find((p: { key: string }) => p.key === 'other').source).toBeUndefined();
    });

    it('getMessageProfileByKey resolves env profiles case-insensitively', () => {
      loadProfilesMock.mockReturnValue({ message: [] });
      process.env.MESSAGE_PROFILE_DISCOMAIN_PROVIDER = 'discord';
      process.env.MESSAGE_PROFILE_DISCOMAIN_BOT_TOKEN = 'env-tok';
      resetEnvProfilesCache();

      expect(getMessageProfileByKey('DiscoMain')?.source).toBe('env');
    });

    it('saveMessageProfiles strips env-sourced profiles', () => {
      saveMessageProfiles({
        message: [
          { key: 'envone', name: 'E', provider: 'discord', config: { botToken: 's3cret' }, source: 'env' },
          { key: 'fileone', name: 'F', provider: 'slack', config: {} },
        ],
      });

      expect(saveProfilesMock).toHaveBeenCalledWith('message-profiles.json', {
        message: [{ key: 'fileone', name: 'F', provider: 'slack', config: {} }],
      });
    });
  });

  describe('llmProfiles', () => {
    const { loadLlmProfiles, saveLlmProfiles } = require('../../src/config/llmProfiles');

    it('overlays env LLM profiles with normalized modelType', () => {
      loadProfilesMock.mockReturnValue({ llm: [] });
      process.env.LLM_PROFILE_GPT4MAIN_PROVIDER = 'openai';
      process.env.LLM_PROFILE_GPT4MAIN_API_KEY = 'sk-env';
      process.env.LLM_PROFILE_GPT4MAIN_MODEL_TYPE = 'both';
      resetEnvProfilesCache();

      const { llm } = loadLlmProfiles();
      expect(llm).toHaveLength(1);
      expect(llm[0]).toMatchObject({
        key: 'gpt4main',
        provider: 'openai',
        modelType: 'both',
        source: 'env',
        config: { apiKey: 'sk-env' },
      });
    });

    it('env LLM profile shadows file profile with the same key', () => {
      loadProfilesMock.mockReturnValue({
        llm: [{ key: 'gpt4main', name: 'File', provider: 'openai', config: { apiKey: 'file' } }],
      });
      process.env.LLM_PROFILE_GPT4MAIN_PROVIDER = 'openai';
      process.env.LLM_PROFILE_GPT4MAIN_API_KEY = 'env';
      resetEnvProfilesCache();

      const { llm } = loadLlmProfiles();
      expect(llm).toHaveLength(1);
      expect(llm[0].config.apiKey).toBe('env');
    });

    it('saveLlmProfiles strips env-sourced profiles', () => {
      saveLlmProfiles({
        llm: [
          { key: 'env1', name: 'E', provider: 'openai', config: { apiKey: 's3cret' }, source: 'env' },
          { key: 'file1', name: 'F', provider: 'openai', config: {} },
        ],
      });
      const written = saveProfilesMock.mock.calls[0][1];
      expect(written.llm).toHaveLength(1);
      expect(written.llm[0].key).toBe('file1');
    });
  });

  describe('memoryProfiles', () => {
    const { loadMemoryProfiles, saveMemoryProfiles } = require('../../src/config/memoryProfiles');

    it('overlays env memory profiles with numeric coercion for known numeric keys', () => {
      loadProfilesMock.mockReturnValue({ memory: [] });
      process.env.MEMORY_PROFILE_MEM0MAIN_PROVIDER = 'mem0';
      process.env.MEMORY_PROFILE_MEM0MAIN_API_KEY = 'm0-key';
      process.env.MEMORY_PROFILE_MEM0MAIN_TIMEOUT_MS = '5000';
      process.env.MEMORY_PROFILE_MEM0MAIN_USER_ID = '12345';
      resetEnvProfilesCache();

      const { memory } = loadMemoryProfiles();
      expect(memory).toHaveLength(1);
      expect(memory[0].source).toBe('env');
      expect(memory[0].config.timeoutMs).toBe(5000); // coerced number
      expect(memory[0].config.userId).toBe('12345'); // stays string
    });

    it('saveMemoryProfiles strips env-sourced profiles', () => {
      saveMemoryProfiles({
        memory: [
          { key: 'env1', name: 'E', provider: 'mem0', config: { apiKey: 's3cret' }, source: 'env' },
          { key: 'file1', name: 'F', provider: 'mem0', config: {} },
        ],
      });
      const written = saveProfilesMock.mock.calls[0][1];
      expect(written.memory).toHaveLength(1);
      expect(written.memory[0].key).toBe('file1');
    });
  });
});
