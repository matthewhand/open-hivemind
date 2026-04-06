import * as fs from 'fs';
import { loadMemoryProfiles } from '../../src/config/memoryProfiles';
import { loadToolProfiles } from '../../src/config/toolProfiles';
import { initProviders } from '../../src/initProviders';
import {
  instantiateMemoryProvider,
  instantiateToolProvider,
  loadPlugin,
} from '../../src/plugins/PluginLoader';
import { providerRegistry } from '../../src/registries/ProviderRegistry';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  const mockAccess = jest.fn();
  const mockReaddir = jest.fn();
  const fsObj = {
    ...actual,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    constants: actual.constants,
    promises: {
      access: mockAccess,
      readdir: mockReaddir,
    },
  };
  // Support both default and named import styles
  fsObj.default = fsObj;
  return { __esModule: true, ...fsObj, default: fsObj };
});

jest.mock('../../src/config/memoryProfiles', () => ({
  loadMemoryProfiles: jest.fn(),
}));

jest.mock('../../src/config/toolProfiles', () => ({
  loadToolProfiles: jest.fn(),
}));

jest.mock('../../src/plugins/PluginLoader', () => ({
  loadPlugin: jest.fn(),
  instantiateMemoryProvider: jest.fn(),
  instantiateToolProvider: jest.fn(),
}));

jest.mock('../../src/registries/ProviderRegistry', () => {
  const memoryProviders = new Map();
  const toolProviders = new Map();
  const mockRegistry = {
    register: jest.fn(),
    registerMemoryProvider: jest.fn((name: string, provider: any) => {
      memoryProviders.set(name, provider);
    }),
    registerToolProvider: jest.fn((name: string, provider: any) => {
      toolProviders.set(name, provider);
    }),
    getMemoryProvider: jest.fn((name: string) => memoryProviders.get(name)),
    getToolProvider: jest.fn((name: string) => toolProviders.get(name)),
    registerInstaller: jest.fn(),
    _memoryProviders: memoryProviders,
    _toolProviders: toolProviders,
  };
  return {
    providerRegistry: mockRegistry,
    ProviderRegistry: {
      getInstance: () => mockRegistry,
    },
  };
});

jest.mock('@hivemind/llm-openswarm', () => ({
  SwarmInstaller: jest.fn().mockImplementation(() => ({
    id: 'swarm-installer',
  })),
}));

const mockedFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;
const mockedLoadMemoryProfiles = loadMemoryProfiles as jest.MockedFunction<
  typeof loadMemoryProfiles
>;
const mockedLoadToolProfiles = loadToolProfiles as jest.MockedFunction<typeof loadToolProfiles>;
const mockedLoadPlugin = loadPlugin as jest.MockedFunction<typeof loadPlugin>;
const mockedInstantiateMemoryProvider = instantiateMemoryProvider as jest.MockedFunction<
  typeof instantiateMemoryProvider
>;
const mockedInstantiateToolProvider = instantiateToolProvider as jest.MockedFunction<
  typeof instantiateToolProvider
>;
const mockRegistry = providerRegistry as jest.Mocked<typeof providerRegistry> & {
  _memoryProviders: Map<string, any>;
  _toolProviders: Map<string, any>;
};

/**
 * Helper: set up fs.promises.access and readdir to simulate:
 *  - providers dir does not exist (ENOENT)
 *  - packages dir exists with given entries (for both memory and tool scans)
 */
function setupPackagesDir(entries: Array<{ name: string; isDirectory: () => boolean }>) {
  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  mockedFsPromises.access
    .mockRejectedValueOnce(enoent) // providers dir
    .mockResolvedValueOnce(undefined as any) // packages dir (memory scan)
    .mockResolvedValueOnce(undefined as any); // packages dir (tool scan)
  mockedFsPromises.readdir.mockResolvedValue(entries as any);
}

function setupNoProvidersDirNoPackagesDir() {
  const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  mockedFsPromises.access.mockRejectedValue(enoent);
}

describe('initProviders — memory and tool discovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegistry._memoryProviders.clear();
    mockRegistry._toolProviders.clear();

    // Restore registry mock implementations (clearAllMocks preserves them,
    // but re-apply to be safe)
    (mockRegistry.registerMemoryProvider as jest.Mock).mockImplementation(
      (name: string, provider: any) => mockRegistry._memoryProviders.set(name, provider)
    );
    (mockRegistry.registerToolProvider as jest.Mock).mockImplementation(
      (name: string, provider: any) => mockRegistry._toolProviders.set(name, provider)
    );
    (mockRegistry.getMemoryProvider as jest.Mock).mockImplementation((name: string) =>
      mockRegistry._memoryProviders.get(name)
    );
    (mockRegistry.getToolProvider as jest.Mock).mockImplementation((name: string) =>
      mockRegistry._toolProviders.get(name)
    );

    // Default: no providers dir, no packages dir
    setupNoProvidersDirNoPackagesDir();

    // Default: empty profiles
    mockedLoadMemoryProfiles.mockReturnValue({ memory: [] });
    mockedLoadToolProfiles.mockReturnValue({ tool: [] });
  });

  describe('discoverMemoryProviders', () => {
    test('discovers memory providers from profiles', async () => {
      mockedLoadMemoryProfiles.mockReturnValue({
        memory: [
          { key: 'mem0-default', name: 'Mem0', provider: 'memory-mem0', config: { apiKey: 'k' } },
        ],
      });

      const mockMod = { create: jest.fn() };
      const mockInstance = { id: 'mem0', type: 'memory' };
      mockedLoadPlugin.mockReturnValue(mockMod);
      mockedInstantiateMemoryProvider.mockReturnValue(mockInstance);

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('memory-mem0');
      expect(mockedInstantiateMemoryProvider).toHaveBeenCalledWith(mockMod, { apiKey: 'k' });
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledWith(
        'mem0-default',
        mockInstance
      );
    });

    test('discovers memory providers from packages/memory-* directories', async () => {
      setupPackagesDir([
        { name: 'memory-zep', isDirectory: () => true },
        { name: 'tool-mcp', isDirectory: () => true },
        { name: 'other-pkg', isDirectory: () => true },
      ]);

      const mockMemMod = { create: jest.fn() };
      const mockMemInstance = { id: 'zep', type: 'memory' };
      const mockToolMod = { create: jest.fn() };
      const mockToolInstance = { id: 'mcp', type: 'tool' };

      mockedLoadPlugin.mockReturnValueOnce(mockMemMod).mockReturnValueOnce(mockToolMod);
      mockedInstantiateMemoryProvider.mockReturnValue(mockMemInstance);
      mockedInstantiateToolProvider.mockReturnValue(mockToolInstance);

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('memory-zep');
      expect(mockedInstantiateMemoryProvider).toHaveBeenCalledWith(mockMemMod);
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledWith(
        'memory-zep',
        mockMemInstance
      );
    });

    test('handles missing packages directory gracefully', async () => {
      setupNoProvidersDirNoPackagesDir();

      await expect(initProviders()).resolves.not.toThrow();
    });

    test('handles failed memory provider instantiation gracefully', async () => {
      mockedLoadMemoryProfiles.mockReturnValue({
        memory: [{ key: 'bad-mem', name: 'Bad', provider: 'memory-bad', config: {} }],
      });

      mockedLoadPlugin.mockImplementation(() => {
        throw new Error('Plugin not found');
      });

      await expect(initProviders()).resolves.not.toThrow();
      expect(mockRegistry.registerMemoryProvider).not.toHaveBeenCalledWith(
        'bad-mem',
        expect.anything()
      );
    });

    test('prefixes provider name with memory- if not already prefixed', async () => {
      mockedLoadMemoryProfiles.mockReturnValue({
        memory: [{ key: 'mem0-short', name: 'Mem0 Short', provider: 'mem0', config: {} }],
      });

      const mockMod = { create: jest.fn() };
      mockedLoadPlugin.mockReturnValue(mockMod);
      mockedInstantiateMemoryProvider.mockReturnValue({ id: 'mem0', type: 'memory' });

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('memory-mem0');
    });
  });

  describe('discoverToolProviders', () => {
    test('discovers tool providers from profiles', async () => {
      mockedLoadToolProfiles.mockReturnValue({
        tool: [
          {
            key: 'mcp-github',
            name: 'GitHub MCP',
            provider: 'tool-mcp-github',
            config: { token: 't' },
          },
        ],
      });

      const mockMod = { create: jest.fn() };
      const mockInstance = { id: 'mcp-github', type: 'tool' };
      mockedLoadPlugin.mockReturnValue(mockMod);
      mockedInstantiateToolProvider.mockReturnValue(mockInstance);

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('tool-mcp-github');
      expect(mockedInstantiateToolProvider).toHaveBeenCalledWith(mockMod, { token: 't' });
      expect(mockRegistry.registerToolProvider).toHaveBeenCalledWith('mcp-github', mockInstance);
    });

    test('discovers tool providers from packages/tool-* directories', async () => {
      setupPackagesDir([{ name: 'tool-code-exec', isDirectory: () => true }]);

      const mockMod = { create: jest.fn() };
      const mockInstance = { id: 'code-exec', type: 'tool' };
      mockedLoadPlugin.mockReturnValue(mockMod);
      mockedInstantiateToolProvider.mockReturnValue(mockInstance);

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('tool-code-exec');
      expect(mockedInstantiateToolProvider).toHaveBeenCalledWith(mockMod);
      expect(mockRegistry.registerToolProvider).toHaveBeenCalledWith(
        'tool-code-exec',
        mockInstance
      );
    });

    test('handles failed tool provider instantiation gracefully', async () => {
      mockedLoadToolProfiles.mockReturnValue({
        tool: [{ key: 'bad-tool', name: 'Bad', provider: 'tool-bad', config: {} }],
      });

      mockedLoadPlugin.mockImplementation(() => {
        throw new Error('Plugin not found');
      });

      await expect(initProviders()).resolves.not.toThrow();
      expect(mockRegistry.registerToolProvider).not.toHaveBeenCalledWith(
        'bad-tool',
        expect.anything()
      );
    });

    test('prefixes provider name with tool- if not already prefixed', async () => {
      mockedLoadToolProfiles.mockReturnValue({
        tool: [{ key: 'mcp-short', name: 'MCP Short', provider: 'mcp', config: {} }],
      });

      const mockMod = { create: jest.fn() };
      mockedLoadPlugin.mockReturnValue(mockMod);
      mockedInstantiateToolProvider.mockReturnValue({ id: 'mcp', type: 'tool' });

      await initProviders();

      expect(mockedLoadPlugin).toHaveBeenCalledWith('tool-mcp');
    });
  });

  describe('profiles and package discovery integration', () => {
    test('loads profiles and instantiates providers from both config and packages', async () => {
      mockedLoadMemoryProfiles.mockReturnValue({
        memory: [
          { key: 'mem0-cfg', name: 'Mem0 Config', provider: 'memory-mem0', config: { k: 'v' } },
        ],
      });
      mockedLoadToolProfiles.mockReturnValue({
        tool: [{ key: 'mcp-cfg', name: 'MCP Config', provider: 'tool-mcp', config: { t: 'x' } }],
      });

      setupPackagesDir([
        { name: 'memory-zep', isDirectory: () => true },
        { name: 'tool-search', isDirectory: () => true },
      ]);

      const mem0Mod = { create: jest.fn() };
      const zepMod = { create: jest.fn() };
      const mcpMod = { create: jest.fn() };
      const searchMod = { create: jest.fn() };

      mockedLoadPlugin
        .mockReturnValueOnce(mem0Mod) // mem0 profile
        .mockReturnValueOnce(zepMod) // zep package
        .mockReturnValueOnce(mcpMod) // mcp profile
        .mockReturnValueOnce(searchMod); // search package

      const mem0Inst = { id: 'mem0', type: 'memory' };
      const zepInst = { id: 'zep', type: 'memory' };
      const mcpInst = { id: 'mcp', type: 'tool' };
      const searchInst = { id: 'search', type: 'tool' };

      mockedInstantiateMemoryProvider.mockReturnValueOnce(mem0Inst).mockReturnValueOnce(zepInst);
      mockedInstantiateToolProvider.mockReturnValueOnce(mcpInst).mockReturnValueOnce(searchInst);

      await initProviders();

      // Profile-based
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledWith('mem0-cfg', mem0Inst);
      expect(mockRegistry.registerToolProvider).toHaveBeenCalledWith('mcp-cfg', mcpInst);
      // Package-based
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledWith('memory-zep', zepInst);
      expect(mockRegistry.registerToolProvider).toHaveBeenCalledWith('tool-search', searchInst);
    });

    test('skips package-based discovery if already registered via profile', async () => {
      mockedLoadMemoryProfiles.mockReturnValue({
        memory: [{ key: 'memory-zep', name: 'Zep', provider: 'memory-zep', config: {} }],
      });

      const profileMod = { create: jest.fn() };
      const profileInst = { id: 'zep-from-profile', type: 'memory' };
      mockedLoadPlugin.mockReturnValue(profileMod);
      mockedInstantiateMemoryProvider.mockReturnValue(profileInst);

      setupPackagesDir([{ name: 'memory-zep', isDirectory: () => true }]);

      await initProviders();

      // Should only be registered once (from profile), not again from package scan
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMemoryProvider).toHaveBeenCalledWith('memory-zep', profileInst);
    });
  });
});
