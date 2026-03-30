import {
  loadMemoryProfiles,
  saveMemoryProfiles,
  getMemoryProfileByKey,
  getMemoryProfiles,
  MemoryProfiles,
  MemoryProfile,
  MemoryProfileSchema,
  validateMemoryProfile,
} from '../../src/config/memoryProfiles';
import * as profileUtils from '../../src/config/profileUtils';

jest.mock('../../src/config/profileUtils');
jest.mock('@common/logger', () => {
  const warnMock = jest.fn();
  return {
    Logger: {
      withContext: () => ({
        warn: warnMock,
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      }),
    },
    __warnMock: warnMock,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __warnMock: loggerWarnMock } = require('@common/logger');

const mockedLoadProfiles = profileUtils.loadProfiles as jest.MockedFunction<typeof profileUtils.loadProfiles>;
const mockedSaveProfiles = profileUtils.saveProfiles as jest.MockedFunction<typeof profileUtils.saveProfiles>;
const mockedFindProfileByKey = profileUtils.findProfileByKey as jest.MockedFunction<typeof profileUtils.findProfileByKey>;

const SAMPLE_PROFILES: MemoryProfiles = {
  memory: [
    {
      key: 'mem0-default',
      name: 'Mem0 Default',
      description: 'Default Mem0 memory provider',
      provider: 'memory-mem0',
      config: { apiKey: 'test-key' },
    },
    {
      key: 'zep-prod',
      name: 'Zep Production',
      provider: 'memory-zep',
      config: { endpoint: 'https://zep.example.com' },
    },
  ],
};

describe('memoryProfiles', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('loadMemoryProfiles', () => {
    test('calls loadProfiles with correct filename and profileType', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      loadMemoryProfiles();
      expect(mockedLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'memory-profiles.json',
          profileType: 'memory',
        })
      );
    });

    test('passes correct default data to loadProfiles', () => {
      mockedLoadProfiles.mockReturnValue({ memory: [] });

      loadMemoryProfiles();

      const callArgs = mockedLoadProfiles.mock.calls[0][0];
      expect(callArgs.defaultData).toEqual({ memory: [] });
    });

    test('validateAndMigrate handles valid object with memory array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ memory: SAMPLE_PROFILES.memory });
      });

      const result = loadMemoryProfiles();
      expect(result.memory).toHaveLength(2);
    });

    test('validateAndMigrate handles object without memory array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ other: 'data' });
      });

      const result = loadMemoryProfiles();
      expect(result.memory).toEqual([]);
    });

    test('validateAndMigrate throws for null input', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate(null);
      });

      expect(() => loadMemoryProfiles()).toThrow('memory profiles must be an object');
    });

    test('validateAndMigrate throws for non-object input', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate('not an object');
      });

      // String is typeof 'object'? No, string is 'string'. So it should throw.
      expect(() => loadMemoryProfiles()).toThrow('memory profiles must be an object');
    });

    test('validateAndMigrate handles memory field that is not an array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ memory: 'not-array' });
      });

      const result = loadMemoryProfiles();
      expect(result.memory).toEqual([]);
    });

    test('validateAndMigrate skips invalid profiles and keeps valid ones', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({
          memory: [
            { key: 'good', name: 'Good', provider: 'mem0', config: {} },
            { key: 'bad' }, // missing provider and name
            { key: 'also-good', name: 'Also Good', provider: 'mem4ai', config: {} },
          ],
        });
      });

      const result = loadMemoryProfiles();
      expect(result.memory).toHaveLength(2);
      expect(result.memory[0].key).toBe('good');
      expect(result.memory[1].key).toBe('also-good');
    });
  });

  describe('saveMemoryProfiles', () => {
    test('saves profiles to JSON file', () => {
      saveMemoryProfiles(SAMPLE_PROFILES);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('memory-profiles.json', SAMPLE_PROFILES);
    });

    test('saves new profile by appending to existing', () => {
      const updated: MemoryProfiles = {
        memory: [
          ...SAMPLE_PROFILES.memory,
          { key: 'letta-dev', name: 'Letta Dev', provider: 'memory-letta', config: {} },
        ],
      };

      saveMemoryProfiles(updated);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('memory-profiles.json', updated);
      expect(updated.memory).toHaveLength(3);
    });

    test('saves updated profile', () => {
      const updated: MemoryProfiles = {
        memory: SAMPLE_PROFILES.memory.map((p) =>
          p.key === 'mem0-default' ? { ...p, config: { apiKey: 'new-key' } } : p
        ),
      };

      saveMemoryProfiles(updated);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('memory-profiles.json', updated);
      const saved = mockedSaveProfiles.mock.calls[0][1] as MemoryProfiles;
      expect(saved.memory[0].config.apiKey).toBe('new-key');
    });

    test('saves after deleting a profile', () => {
      const updated: MemoryProfiles = {
        memory: SAMPLE_PROFILES.memory.filter((p) => p.key !== 'zep-prod'),
      };

      saveMemoryProfiles(updated);

      const saved = mockedSaveProfiles.mock.calls[0][1] as MemoryProfiles;
      expect(saved.memory).toHaveLength(1);
      expect(saved.memory[0].key).toBe('mem0-default');
    });
  });

  describe('getMemoryProfileByKey', () => {
    test('delegates to findProfileByKey with correct arguments', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);
      mockedFindProfileByKey.mockReturnValue(SAMPLE_PROFILES.memory[0]);

      const profile = getMemoryProfileByKey('mem0-default');
      expect(profile).not.toBeUndefined();
      expect(profile!.name).toBe('Mem0 Default');
      expect(mockedFindProfileByKey).toHaveBeenCalledWith(SAMPLE_PROFILES.memory, 'key', 'mem0-default');
    });
  });

  describe('getMemoryProfiles', () => {
    test('delegates to loadMemoryProfiles', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      getMemoryProfiles();
      expect(mockedLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'memory-profiles.json',
        })
      );
    });
  });

  describe('cache behavior', () => {
    test('reloads from loadProfiles on each call (no stale cache)', () => {
      mockedLoadProfiles
        .mockReturnValueOnce({ memory: [SAMPLE_PROFILES.memory[0]] })
        .mockReturnValueOnce(SAMPLE_PROFILES);

      const first = loadMemoryProfiles();
      expect(first.memory).toHaveLength(1);

      const second = loadMemoryProfiles();
      expect(second.memory).toHaveLength(2);
      expect(mockedLoadProfiles).toHaveBeenCalledTimes(2);
    });
  });

  describe('profile validation', () => {
    test('profiles have required fields (key, name, provider, config)', () => {
      const profile: MemoryProfile = {
        key: 'test',
        name: 'Test',
        provider: 'memory-test',
        config: {},
      };
      expect(profile.key).toBe('test');
      expect(profile.name).toBe('Test');
      expect(profile.provider).toBe('memory-test');
      expect(typeof profile.config).toBe('object');
    });

    test('description field is optional', () => {
      const withDesc: MemoryProfile = {
        key: 'a',
        name: 'A',
        provider: 'p',
        config: {},
        description: 'desc',
      };
      const withoutDesc: MemoryProfile = {
        key: 'b',
        name: 'B',
        provider: 'p',
        config: {},
      };
      expect(withDesc.description).toBe('desc');
      expect(withoutDesc.description).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // Zod schema validation tests
  // -------------------------------------------------------------------

  describe('MemoryProfileSchema (Zod)', () => {
    test('valid config passes schema validation', () => {
      const input = {
        key: 'mem0-cloud',
        name: 'Mem0 Cloud',
        provider: 'mem0',
        config: {
          apiKey: 'sk-test-123',
          baseUrl: 'https://api.mem0.ai/v1',
          userId: 'user-1',
          timeoutMs: 10000,
          maxRetries: 3,
        },
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('mem0');
        expect(result.data.config.apiKey).toBe('sk-test-123');
        expect(result.data.config.timeoutMs).toBe(10000);
      }
    });

    test('valid config with all known fields passes', () => {
      const input = {
        key: 'full',
        name: 'Full Config',
        provider: 'mem0',
        description: 'A fully-loaded profile',
        config: {
          apiKey: 'key',
          baseUrl: 'http://localhost:8000',
          apiUrl: 'http://localhost:9000',
          userId: 'u1',
          agentId: 'a1',
          orgId: 'org1',
          organizationId: 'org2',
          timeoutMs: 5000,
          timeout: 5000,
          maxRetries: 2,
          llmProvider: 'openai',
          llmModel: 'gpt-4',
          embedderModel: 'text-embedding-3-small',
          vectorStoreProvider: 'qdrant',
          historyDbPath: '/tmp/history.db',
          embeddingProviderId: 'embed-1',
          limit: 20,
          endpoint: 'https://example.com',
        },
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('missing provider field fails validation', () => {
      const input = {
        key: 'no-provider',
        name: 'No Provider',
        config: { apiKey: 'key' },
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('empty provider string fails validation', () => {
      const input = {
        key: 'empty-provider',
        name: 'Empty Provider',
        provider: '',
        config: {},
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('missing key field fails validation', () => {
      const input = {
        name: 'No Key',
        provider: 'mem0',
        config: {},
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('missing name field fails validation', () => {
      const input = {
        key: 'no-name',
        provider: 'mem0',
        config: {},
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('config defaults to empty object when omitted', () => {
      const input = {
        key: 'minimal',
        name: 'Minimal',
        provider: 'mem0',
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.config).toEqual({});
      }
    });

    test('extra/unknown config fields are allowed (forward compat)', () => {
      const input = {
        key: 'future-proof',
        name: 'Future Proof',
        provider: 'mem0',
        config: {
          apiKey: 'key',
          futureField: 'some-value',
          anotherNewField: 42,
        },
      };

      const result = MemoryProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        // Unknown fields are preserved
        expect(result.data.config.futureField).toBe('some-value');
        expect(result.data.config.anotherNewField).toBe(42);
      }
    });
  });

  describe('validateMemoryProfile', () => {
    test('returns parsed profile for valid input', () => {
      const input = {
        key: 'test',
        name: 'Test',
        provider: 'mem0',
        config: { apiKey: 'k' },
      };

      const result = validateMemoryProfile(input, 0);
      expect(result).toBeDefined();
      expect(result!.provider).toBe('mem0');
    });

    test('returns undefined and logs warning for missing provider', () => {
      const input = { key: 'bad', name: 'Bad' };

      const result = validateMemoryProfile(input, 3);
      expect(result).toBeUndefined();
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Skipping invalid memory profile',
        expect.objectContaining({
          index: 3,
          errors: expect.arrayContaining([
            expect.objectContaining({ path: 'provider' }),
          ]),
        })
      );
    });

    test('returns profile and logs warning for unknown config fields', () => {
      const input = {
        key: 'extra',
        name: 'Extra Fields',
        provider: 'mem0',
        config: { apiKey: 'k', unknownThing: true },
      };

      const result = validateMemoryProfile(input, 0);
      expect(result).toBeDefined();
      expect(result!.config.unknownThing).toBe(true);
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Memory profile contains unknown config fields (kept for forward compat)',
        expect.objectContaining({
          key: 'extra',
          unknownFields: ['unknownThing'],
        })
      );
    });

    test('returns undefined for completely invalid input', () => {
      const result = validateMemoryProfile(null, 0);
      expect(result).toBeUndefined();
      expect(loggerWarnMock).toHaveBeenCalled();
    });

    test('returns undefined for non-object input', () => {
      const result = validateMemoryProfile('just a string', 1);
      expect(result).toBeUndefined();
    });
  });
});
