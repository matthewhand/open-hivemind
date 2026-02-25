import { ProviderRegistry } from '../../../src/registries/ProviderRegistry';
import { IProvider, IMessageProvider } from '../../../src/types/IProvider';

describe('ProviderRegistry', () => {
  it('should be a singleton', () => {
    const registry1 = ProviderRegistry.getInstance();
    const registry2 = ProviderRegistry.getInstance();
    expect(registry1).toBe(registry2);
  });

  it('should register and retrieve a provider', () => {
    const registry = ProviderRegistry.getInstance();
    const provider: IProvider = {
      id: 'test-provider',
      label: 'Test Provider',
      type: 'other',
      getSchema: () => ({}),
      getSensitiveKeys: () => [],
    };

    registry.registerProvider(provider);
    expect(registry.getProvider('test-provider')).toBe(provider);
  });

  it('should filter message providers', () => {
    const registry = ProviderRegistry.getInstance();
    const messageProvider: IMessageProvider = {
      id: 'msg-provider',
      label: 'Msg Provider',
      type: 'message',
      getSchema: () => ({}),
      getSensitiveKeys: () => [],
      getStatus: async () => ({}),
      getBots: async () => [],
      addBot: async () => {},
      createBot: async () => ({ success: true }),
      reload: async () => ({}),
    };

    registry.registerProvider(messageProvider);

    const msgProviders = registry.getMessageProviders();
    expect(msgProviders).toContain(messageProvider);
    expect(msgProviders.find(p => p.id === 'msg-provider')).toBeDefined();
  });
});
