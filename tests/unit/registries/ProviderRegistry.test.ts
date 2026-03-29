import { ProviderRegistry } from '../../../src/registries/ProviderRegistry';
import type { IMemoryProvider, IToolProvider } from '../../../src/types/IProvider';

/**
 * Helper to get a fresh ProviderRegistry instance for each test.
 * The singleton pattern makes this tricky, so we access the private constructor
 * via reflection.
 */
function createFreshRegistry(): ProviderRegistry {
  // Reset singleton
  (ProviderRegistry as any).instance = undefined;
  return ProviderRegistry.getInstance();
}

function makeMockMemoryProvider(overrides: Partial<IMemoryProvider> = {}): IMemoryProvider {
  return {
    id: 'mock-memory',
    label: 'Mock Memory',
    type: 'memory',
    add: jest.fn().mockResolvedValue({ results: [] }),
    search: jest.fn().mockResolvedValue({ results: [] }),
    getAll: jest.fn().mockResolvedValue({ results: [] }),
    get: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ id: '1', memory: '' }),
    delete: jest.fn().mockResolvedValue(undefined),
    deleteAll: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeMockToolProvider(overrides: Partial<IToolProvider> = {}): IToolProvider {
  return {
    id: 'mock-tool',
    label: 'Mock Tool',
    type: 'tool',
    listTools: jest.fn().mockResolvedValue([]),
    executeTool: jest.fn().mockResolvedValue({ result: null }),
    healthCheck: jest.fn().mockResolvedValue({ status: 'ok' }),
    ...overrides,
  };
}

describe('ProviderRegistry — memory providers', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = createFreshRegistry();
  });

  afterEach(() => {
    (ProviderRegistry as any).instance = undefined;
  });

  test('registers a memory provider', () => {
    const provider = makeMockMemoryProvider();
    registry.registerMemoryProvider('mem0', provider);

    expect(registry.getMemoryProvider('mem0')).toBe(provider);
  });

  test('gets registered memory provider by name', () => {
    const provider = makeMockMemoryProvider({ id: 'zep-mem' });
    registry.registerMemoryProvider('zep', provider);

    const result = registry.getMemoryProvider('zep');
    expect(result).toEqual(expect.objectContaining({ id: expect.any(String) }));
    expect(result!.id).toBe('zep-mem');
  });

  test('gets all memory providers', () => {
    const p1 = makeMockMemoryProvider({ id: 'mem-1' });
    const p2 = makeMockMemoryProvider({ id: 'mem-2' });
    registry.registerMemoryProvider('one', p1);
    registry.registerMemoryProvider('two', p2);

    const all = registry.getMemoryProviders();
    expect(all.size).toBe(2);
    expect(all.get('one')).toBe(p1);
    expect(all.get('two')).toBe(p2);
  });

  test('removes a memory provider', () => {
    const provider = makeMockMemoryProvider();
    registry.registerMemoryProvider('mem0', provider);
    expect(registry.getMemoryProvider('mem0')).toEqual(expect.objectContaining({ id: 'mock-memory', type: 'memory' }));

    registry.removeMemoryProvider('mem0');
    expect(registry.getMemoryProvider('mem0')).toBeUndefined();
  });

  test('returns undefined for non-existent memory provider', () => {
    expect(registry.getMemoryProvider('nonexistent')).toBeUndefined();
  });

  test('duplicate registration overwrites previous memory provider', () => {
    const p1 = makeMockMemoryProvider({ id: 'first' });
    const p2 = makeMockMemoryProvider({ id: 'second' });
    registry.registerMemoryProvider('mem0', p1);
    registry.registerMemoryProvider('mem0', p2);

    expect(registry.getMemoryProvider('mem0')!.id).toBe('second');
    // Warning is now emitted via structured Debug logger, not console.warn
  });

  test('removing non-existent memory provider does not throw', () => {
    expect(() => registry.removeMemoryProvider('nonexistent')).not.toThrow();
  });
});

describe('ProviderRegistry — tool providers', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = createFreshRegistry();
  });

  afterEach(() => {
    (ProviderRegistry as any).instance = undefined;
  });

  test('registers a tool provider', () => {
    const provider = makeMockToolProvider();
    registry.registerToolProvider('mcp-github', provider);

    expect(registry.getToolProvider('mcp-github')).toBe(provider);
  });

  test('gets registered tool provider by name', () => {
    const provider = makeMockToolProvider({ id: 'web-search-tool' });
    registry.registerToolProvider('web-search', provider);

    const result = registry.getToolProvider('web-search');
    expect(result).toEqual(expect.objectContaining({ id: expect.any(String) }));
    expect(result!.id).toBe('web-search-tool');
  });

  test('gets all tool providers', () => {
    const p1 = makeMockToolProvider({ id: 'tool-1' });
    const p2 = makeMockToolProvider({ id: 'tool-2' });
    registry.registerToolProvider('one', p1);
    registry.registerToolProvider('two', p2);

    const all = registry.getToolProviders();
    expect(all.size).toBe(2);
    expect(all.get('one')).toBe(p1);
    expect(all.get('two')).toBe(p2);
  });

  test('removes a tool provider', () => {
    const provider = makeMockToolProvider();
    registry.registerToolProvider('mcp-github', provider);
    expect(registry.getToolProvider('mcp-github')).toEqual(expect.objectContaining({ id: 'mock-tool', type: 'tool' }));

    registry.removeToolProvider('mcp-github');
    expect(registry.getToolProvider('mcp-github')).toBeUndefined();
  });

  test('returns undefined for non-existent tool provider', () => {
    expect(registry.getToolProvider('nonexistent')).toBeUndefined();
  });

  test('duplicate registration overwrites previous tool provider', () => {
    const p1 = makeMockToolProvider({ id: 'first' });
    const p2 = makeMockToolProvider({ id: 'second' });
    registry.registerToolProvider('mcp-github', p1);
    registry.registerToolProvider('mcp-github', p2);

    expect(registry.getToolProvider('mcp-github')!.id).toBe('second');
    // Warning is now emitted via structured Debug logger, not console.warn
  });

  test('removing non-existent tool provider does not throw', () => {
    expect(() => registry.removeToolProvider('nonexistent')).not.toThrow();
  });
});

describe('ProviderRegistry — singleton behavior', () => {
  afterEach(() => {
    (ProviderRegistry as any).instance = undefined;
  });

  test('getInstance returns same instance', () => {
    (ProviderRegistry as any).instance = undefined;
    const a = ProviderRegistry.getInstance();
    const b = ProviderRegistry.getInstance();
    expect(a).toBe(b);
  });

  test('memory and tool providers are independent maps', () => {
    const registry = createFreshRegistry();
    const memProvider = makeMockMemoryProvider();
    const toolProvider = makeMockToolProvider();

    registry.registerMemoryProvider('shared-name', memProvider);
    registry.registerToolProvider('shared-name', toolProvider);

    expect(registry.getMemoryProvider('shared-name')).toBe(memProvider);
    expect(registry.getToolProvider('shared-name')).toBe(toolProvider);
    expect(registry.getMemoryProviders().size).toBe(1);
    expect(registry.getToolProviders().size).toBe(1);
  });
});
