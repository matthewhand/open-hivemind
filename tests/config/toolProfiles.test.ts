import {
  loadToolProfiles,
  saveToolProfiles,
  getToolProfileByKey,
  getToolProfiles,
  ToolProfiles,
  ToolProfile,
} from '../../src/config/toolProfiles';
import * as profileUtils from '../../src/config/profileUtils';

jest.mock('../../src/config/profileUtils');

const mockedLoadProfiles = profileUtils.loadProfiles as jest.MockedFunction<typeof profileUtils.loadProfiles>;
const mockedSaveProfiles = profileUtils.saveProfiles as jest.MockedFunction<typeof profileUtils.saveProfiles>;
const mockedFindProfileByKey = profileUtils.findProfileByKey as jest.MockedFunction<typeof profileUtils.findProfileByKey>;

const SAMPLE_PROFILES: ToolProfiles = {
  tool: [
    {
      key: 'mcp-github',
      name: 'GitHub MCP',
      description: 'GitHub tool provider via MCP',
      provider: 'tool-mcp-github',
      config: { token: 'ghp_test' },
    },
    {
      key: 'web-search',
      name: 'Web Search',
      provider: 'tool-web-search',
      config: { engine: 'google' },
    },
  ],
};

describe('toolProfiles', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('loadToolProfiles', () => {
    test('loads profiles from JSON file', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      const result = loadToolProfiles();
      expect(result.tool).toHaveLength(2);
      expect(result.tool[0].key).toBe('mcp-github');
      expect(result.tool[1].provider).toBe('tool-web-search');
      expect(mockedLoadProfiles).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'tool-profiles.json',
          profileType: 'tool',
        })
      );
    });

    test('returns default when loadProfiles returns defaults (missing file)', () => {
      mockedLoadProfiles.mockReturnValue({ tool: [] });

      const result = loadToolProfiles();
      expect(result.tool).toEqual([]);
    });

    test('passes correct default data to loadProfiles', () => {
      mockedLoadProfiles.mockReturnValue({ tool: [] });

      loadToolProfiles();

      const callArgs = mockedLoadProfiles.mock.calls[0][0];
      expect(callArgs.defaultData).toEqual({ tool: [] });
    });

    test('validateAndMigrate handles valid object with tool array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ tool: SAMPLE_PROFILES.tool });
      });

      const result = loadToolProfiles();
      expect(result.tool).toHaveLength(2);
    });

    test('validateAndMigrate handles object without tool array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ other: 'data' });
      });

      const result = loadToolProfiles();
      expect(result.tool).toEqual([]);
    });

    test('validateAndMigrate throws for null input', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate(null);
      });

      expect(() => loadToolProfiles()).toThrow('tool profiles must be an object');
    });

    test('validateAndMigrate throws for non-object input', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate('not an object');
      });

      expect(() => loadToolProfiles()).toThrow('tool profiles must be an object');
    });

    test('validateAndMigrate handles tool field that is not an array', () => {
      mockedLoadProfiles.mockImplementation((opts) => {
        return opts.validateAndMigrate({ tool: 'not-array' });
      });

      const result = loadToolProfiles();
      expect(result.tool).toEqual([]);
    });
  });

  describe('saveToolProfiles', () => {
    test('saves profiles to JSON file', () => {
      saveToolProfiles(SAMPLE_PROFILES);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('tool-profiles.json', SAMPLE_PROFILES);
    });

    test('saves new profile by appending to existing', () => {
      const updated: ToolProfiles = {
        tool: [
          ...SAMPLE_PROFILES.tool,
          { key: 'code-exec', name: 'Code Exec', provider: 'tool-code-exec', config: {} },
        ],
      };

      saveToolProfiles(updated);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('tool-profiles.json', updated);
      expect(updated.tool).toHaveLength(3);
    });

    test('saves updated profile', () => {
      const updated: ToolProfiles = {
        tool: SAMPLE_PROFILES.tool.map((p) =>
          p.key === 'mcp-github' ? { ...p, config: { token: 'ghp_new' } } : p
        ),
      };

      saveToolProfiles(updated);

      expect(mockedSaveProfiles).toHaveBeenCalledWith('tool-profiles.json', updated);
      const saved = mockedSaveProfiles.mock.calls[0][1] as ToolProfiles;
      expect(saved.tool[0].config.token).toBe('ghp_new');
    });

    test('saves after deleting a profile', () => {
      const updated: ToolProfiles = {
        tool: SAMPLE_PROFILES.tool.filter((p) => p.key !== 'web-search'),
      };

      saveToolProfiles(updated);

      const saved = mockedSaveProfiles.mock.calls[0][1] as ToolProfiles;
      expect(saved.tool).toHaveLength(1);
      expect(saved.tool[0].key).toBe('mcp-github');
    });
  });

  describe('getToolProfileByKey', () => {
    test('returns profile by key', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);
      mockedFindProfileByKey.mockReturnValue(SAMPLE_PROFILES.tool[0]);

      const profile = getToolProfileByKey('mcp-github');
      expect(profile).toBeDefined();
      expect(profile!.name).toBe('GitHub MCP');
      expect(mockedFindProfileByKey).toHaveBeenCalledWith(SAMPLE_PROFILES.tool, 'key', 'mcp-github');
    });

    test('returns undefined for non-existent key', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);
      mockedFindProfileByKey.mockReturnValue(undefined);

      const profile = getToolProfileByKey('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  describe('getToolProfiles', () => {
    test('returns all profiles', () => {
      mockedLoadProfiles.mockReturnValue(SAMPLE_PROFILES);

      const profiles = getToolProfiles();
      expect(profiles.tool).toHaveLength(2);
    });

    test('returns empty when no profiles configured', () => {
      mockedLoadProfiles.mockReturnValue({ tool: [] });

      const profiles = getToolProfiles();
      expect(profiles.tool).toHaveLength(0);
    });
  });

  describe('cache behavior', () => {
    test('reloads from loadProfiles on each call (no stale cache)', () => {
      mockedLoadProfiles
        .mockReturnValueOnce({ tool: [SAMPLE_PROFILES.tool[0]] })
        .mockReturnValueOnce(SAMPLE_PROFILES);

      const first = loadToolProfiles();
      expect(first.tool).toHaveLength(1);

      const second = loadToolProfiles();
      expect(second.tool).toHaveLength(2);
      expect(mockedLoadProfiles).toHaveBeenCalledTimes(2);
    });
  });

  describe('profile validation', () => {
    test('profiles have required fields (key, name, provider, config)', () => {
      const profile: ToolProfile = {
        key: 'test',
        name: 'Test',
        provider: 'tool-test',
        config: {},
      };
      expect(profile.key).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.provider).toBeDefined();
      expect(profile.config).toBeDefined();
    });

    test('description field is optional', () => {
      const withDesc: ToolProfile = {
        key: 'a',
        name: 'A',
        provider: 'p',
        config: {},
        description: 'desc',
      };
      const withoutDesc: ToolProfile = {
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
