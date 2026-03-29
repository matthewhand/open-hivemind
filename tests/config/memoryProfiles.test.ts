import {
  loadMemoryProfiles,
  saveMemoryProfiles,
  getMemoryProfileByKey,
  getMemoryProfiles,
  MemoryProfiles,
  MemoryProfile,
} from '../../src/config/memoryProfiles';
import * as profileUtils from '../../src/config/profileUtils';

jest.mock('../../src/config/profileUtils');

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
    test('loads profiles from JSON file', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      const result = loadMemoryProfiles();
      expect(result.memory).toHaveLength(2);
      expect(result.memory[0].key).toBe('mem0-default');
      expect(result.memory[1].provider).toBe('memory-zep');
      expect(mockedLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'memory-profiles.json',
          profileType: 'memory',
        })
      );
    });

    test('returns default when loadProfiles returns defaults (missing file)', () => {
      mockedLoadProfiles.mockReturnValue({ memory: [] });

      const result = loadMemoryProfiles();
      expect(result.memory).toEqual([]);
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
    test('returns profile by key', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);
      mockedFindProfileByKey.mockReturnValue(SAMPLE_PROFILES.memory[0]);

      const profile = getMemoryProfileByKey('mem0-default');
      expect(profile).toBeDefined();
      expect(profile!.name).toBe('Mem0 Default');
      expect(mockedFindProfileByKey).toHaveBeenCalledWith(SAMPLE_PROFILES.memory, 'key', 'mem0-default');
    });

    test('returns undefined for non-existent key', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);
      mockedFindProfileByKey.mockReturnValue(undefined);

      const profile = getMemoryProfileByKey('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  describe('getMemoryProfiles', () => {
    test('returns all profiles', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      const profiles = getMemoryProfiles();
      expect(profiles.memory).toHaveLength(2);
    });

    test('returns empty when no profiles configured', () => {
      mockedLoadProfiles.mockReturnValue({ memory: [] });

      const profiles = getMemoryProfiles();
      expect(profiles.memory).toHaveLength(0);
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
      expect(profile.key).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.provider).toBeDefined();
      expect(profile.config).toBeDefined();
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
});
