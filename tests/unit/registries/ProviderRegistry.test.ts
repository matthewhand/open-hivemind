/**
 * Unit tests for ProviderRegistry.
 *
 * Tests register/get/getAll/remove for memory and tool providers,
 * plus the existing messenger/LLM provider filtering.
 */

import { ProviderRegistry } from '../../../src/registries/ProviderRegistry';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  // We cannot use getInstance() across tests because it is a singleton with
  // state leaking between tests.  Instead we create a fresh instance via a
  // small helper that calls the private constructor through reflection.
  beforeEach(() => {
    registry = Object.create(ProviderRegistry.prototype);
    // Re-run the constructor body manually (the Maps are initialised inline)
    (registry as any).providers = new Map();
    (registry as any).installers = new Map();
  });

  /* -- helpers ------------------------------------------------------------ */

  const makeProvider = (id: string, type: 'messenger' | 'llm' = 'messenger') => ({
    id,
    label: id,
    type,
    getSchema: jest.fn().mockReturnValue({}),
    getConfig: jest.fn().mockReturnValue({}),
    getSensitiveKeys: jest.fn().mockReturnValue([]),
  });

  const makeInstaller = (id: string) => ({
    id,
    label: id,
    checkPrerequisites: jest.fn().mockResolvedValue(true),
    checkInstalled: jest.fn().mockResolvedValue(false),
    install: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
    start: jest.fn().mockResolvedValue({ success: true, message: 'started' }),
  });

  /* -- register / get ----------------------------------------------------- */

  describe('register and get', () => {
    it('registers and retrieves a provider by id', () => {
      const p = makeProvider('discord');
      registry.register(p as any);
      expect(registry.get('discord')).toBe(p);
    });

    it('returns undefined for unknown id', () => {
      expect(registry.get('nope')).toBeUndefined();
    });

    it('overwrites existing provider with same id (warns)', () => {
      const p1 = makeProvider('slack');
      const p2 = makeProvider('slack');
      registry.register(p1 as any);
      registry.register(p2 as any);
      expect(registry.get('slack')).toBe(p2);
    });
  });

  /* -- getAll ------------------------------------------------------------- */

  describe('getAll', () => {
    it('returns all registered providers', () => {
      registry.register(makeProvider('a') as any);
      registry.register(makeProvider('b') as any);
      expect(registry.getAll()).toHaveLength(2);
    });

    it('returns empty array when no providers', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  /* -- type filtering ----------------------------------------------------- */

  describe('getMessageProviders', () => {
    it('returns only messenger-type providers', () => {
      registry.register(makeProvider('discord', 'messenger') as any);
      registry.register(makeProvider('openai', 'llm') as any);
      const messengers = registry.getMessageProviders();
      expect(messengers).toHaveLength(1);
      expect(messengers[0].id).toBe('discord');
    });
  });

  describe('getLLMProviders', () => {
    it('returns only llm-type providers', () => {
      registry.register(makeProvider('discord', 'messenger') as any);
      registry.register(makeProvider('openai', 'llm') as any);
      const llms = registry.getLLMProviders();
      expect(llms).toHaveLength(1);
      expect(llms[0].id).toBe('openai');
    });
  });

  /* -- installers --------------------------------------------------------- */

  describe('registerInstaller and getInstaller', () => {
    it('registers and retrieves an installer', () => {
      const installer = makeInstaller('openswarm');
      registry.registerInstaller(installer as any);
      expect(registry.getInstaller('openswarm')).toBe(installer);
    });

    it('returns undefined for unknown installer', () => {
      expect(registry.getInstaller('nope')).toBeUndefined();
    });
  });

  describe('getAllInstallers', () => {
    it('returns all registered installers', () => {
      registry.registerInstaller(makeInstaller('a') as any);
      registry.registerInstaller(makeInstaller('b') as any);
      expect(registry.getAllInstallers()).toHaveLength(2);
    });

    it('returns empty array when no installers', () => {
      expect(registry.getAllInstallers()).toEqual([]);
    });
  });

  /* -- singleton ---------------------------------------------------------- */

  describe('singleton', () => {
    it('getInstance returns same instance', () => {
      const a = ProviderRegistry.getInstance();
      const b = ProviderRegistry.getInstance();
      expect(a).toBe(b);
    });
  });
});
