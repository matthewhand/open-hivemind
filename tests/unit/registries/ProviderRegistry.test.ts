/**
 * Unit tests for ProviderRegistry singleton.
 *
 * Tests cover: getInstance singleton, register/get/getAll, overwrite warning,
 * type-filtered getters (getMessageProviders, getLLMProviders),
 * installer registration, and edge cases.
 */

import { ProviderRegistry } from '../../../src/registries/ProviderRegistry';

// Minimal stubs that satisfy IProvider duck-typing
function makeProvider(overrides: Partial<{ id: string; label: string; type: string }> = {}) {
  return {
    id: overrides.id ?? 'test-provider',
    label: overrides.label ?? 'Test',
    type: overrides.type ?? 'messenger',
    getSchema: jest.fn().mockReturnValue({}),
    getConfig: jest.fn().mockReturnValue({}),
    getSensitiveKeys: jest.fn().mockReturnValue([]),
  } as any;
}

function makeInstaller(overrides: Partial<{ id: string; label: string }> = {}) {
  return {
    id: overrides.id ?? 'test-installer',
    label: overrides.label ?? 'Test Installer',
    checkPrerequisites: jest.fn().mockResolvedValue(true),
    checkInstalled: jest.fn().mockResolvedValue(false),
    install: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    start: jest.fn().mockResolvedValue({ success: true, message: 'started' }),
  } as any;
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    // Access the singleton and clear its internal state between tests.
    // We use the public API (getInstance) then reset via register/get dance
    // But since it's a singleton with private maps, we need to reset it.
    registry = ProviderRegistry.getInstance();

    // Clear providers and installers by accessing the private maps through any cast
    // This is necessary for test isolation
    (registry as any).providers = new Map();
    (registry as any).installers = new Map();
  });

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const a = ProviderRegistry.getInstance();
      const b = ProviderRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('register / get / getAll', () => {
    it('registers a provider and retrieves it by id', () => {
      const provider = makeProvider({ id: 'slack' });
      registry.register(provider);
      expect(registry.get('slack')).toBe(provider);
    });

    it('returns undefined for an unregistered id', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('getAll returns all registered providers', () => {
      const a = makeProvider({ id: 'a' });
      const b = makeProvider({ id: 'b' });
      registry.register(a);
      registry.register(b);
      expect(registry.getAll()).toEqual(expect.arrayContaining([a, b]));
      expect(registry.getAll()).toHaveLength(2);
    });

    it('overwrites provider with the same id and warns', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const first = makeProvider({ id: 'dup' });
      const second = makeProvider({ id: 'dup', label: 'Second' });

      registry.register(first);
      registry.register(second);

      expect(registry.get('dup')).toBe(second);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('dup')
      );
      warnSpy.mockRestore();
    });
  });

  describe('getMessageProviders', () => {
    it('returns only providers with type "messenger"', () => {
      const messenger = makeProvider({ id: 'slack', type: 'messenger' });
      const llm = makeProvider({ id: 'openai', type: 'llm' });
      registry.register(messenger);
      registry.register(llm);

      const result = registry.getMessageProviders();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('slack');
    });

    it('returns empty array when no messenger providers registered', () => {
      const llm = makeProvider({ id: 'openai', type: 'llm' });
      registry.register(llm);
      expect(registry.getMessageProviders()).toEqual([]);
    });
  });

  describe('getLLMProviders', () => {
    it('returns only providers with type "llm"', () => {
      const messenger = makeProvider({ id: 'slack', type: 'messenger' });
      const llm = makeProvider({ id: 'openai', type: 'llm' });
      registry.register(messenger);
      registry.register(llm);

      const result = registry.getLLMProviders();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('openai');
    });
  });

  describe('registerInstaller / getInstaller / getAllInstallers', () => {
    it('registers and retrieves an installer by id', () => {
      const installer = makeInstaller({ id: 'openswarm' });
      registry.registerInstaller(installer);
      expect(registry.getInstaller('openswarm')).toBe(installer);
    });

    it('returns undefined for unregistered installer', () => {
      expect(registry.getInstaller('missing')).toBeUndefined();
    });

    it('getAllInstallers returns all registered installers', () => {
      const a = makeInstaller({ id: 'a' });
      const b = makeInstaller({ id: 'b' });
      registry.registerInstaller(a);
      registry.registerInstaller(b);
      expect(registry.getAllInstallers()).toHaveLength(2);
    });
  });
});
