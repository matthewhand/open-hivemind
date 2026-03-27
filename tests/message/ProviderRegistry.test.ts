import fs from 'fs';
import path from 'path';
import type { IMessengerService } from '../../src/message/interfaces/IMessengerService';
import {
  getLoadedProviders,
  getMessengerServiceByProvider,
  getRegisteredProviders,
  isProviderRegistered,
  refreshProviders,
  unloadProvider,
} from '../../src/message/ProviderRegistry';

// Mock fs with promises support
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      access: jest.fn(),
      readdir: jest.fn(),
    },
    constants: actual.constants,
  };
});

const mockFsPromises = fs.promises as jest.Mocked<typeof fs.promises>;

// Mock Service Implementation
const mockServiceInstance: IMessengerService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  sendMessageToChannel: jest.fn().mockResolvedValue('msg-id'),
  getMessagesFromChannel: jest.fn().mockResolvedValue([]),
  shutdown: jest.fn().mockResolvedValue(undefined),
  getClientId: jest.fn().mockReturnValue('mock-client-id'),
  getDefaultChannel: jest.fn().mockReturnValue('general'),
  setMessageHandler: jest.fn(),
};

const mockInvalidServiceInstance = {
  initialize: jest.fn(),
  // Missing required methods like sendMessageToChannel
};

// Mock Providers (virtual modules)
jest.mock(
  '../../src/integrations/validprovider/ValidproviderService',
  () => {
    const MockClass = jest.fn();
    (MockClass as any).getInstance = jest.fn(() => mockServiceInstance);
    return {
      ValidproviderService: MockClass,
    };
  },
  { virtual: true }
);

jest.mock(
  '../../src/integrations/missingfactory/MissingfactoryService',
  () => {
    const MockClass = jest.fn();
    return {
      MissingfactoryService: MockClass, // No getInstance
    };
  },
  { virtual: true }
);

jest.mock(
  '../../src/integrations/invalidservice/InvalidserviceService',
  () => {
    const MockClass = jest.fn();
    (MockClass as any).getInstance = jest.fn(() => mockInvalidServiceInstance);
    return {
      InvalidserviceService: MockClass,
    };
  },
  { virtual: true }
);

/**
 * Helper: configure fs.promises mocks so that discoverProviders()
 * sees the given list of integration directory entries.
 *
 * `accessFilter` is called with the path string; return true for paths
 * that should "exist" (resolve), false to throw ENOENT.
 */
function setupFsMocks(
  entries: Array<{ name: string; isDirectory: () => boolean }>,
  accessFilter: (p: string) => boolean = () => true
) {
  (mockFsPromises.access as jest.Mock).mockImplementation(
    async (filePath: string) => {
      if (accessFilter(filePath.toString())) return undefined;
      const err: any = new Error('ENOENT');
      err.code = 'ENOENT';
      throw err;
    }
  );

  (mockFsPromises.readdir as jest.Mock).mockResolvedValue(entries as any);
}

describe('ProviderRegistry', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Set up default empty mocks so refreshProviders() doesn't crash
    setupFsMocks([]);
    await refreshProviders();
    getLoadedProviders().forEach((p) => unloadProvider(p));
  });

  describe('Discovery', () => {
    it('should discover providers from the integrations directory', async () => {
      // Mock directory structure
      setupFsMocks([
        { name: 'validprovider', isDirectory: () => true },
        { name: 'otherprovider', isDirectory: () => true },
      ]);

      // Force refresh to trigger discovery with new mocks
      await refreshProviders();

      const providers = await getRegisteredProviders();

      expect(mockFsPromises.readdir).toHaveBeenCalled();
    });
  });

  describe('getMessengerServiceByProvider', () => {
    it('should load and return a valid provider service', async () => {
      setupFsMocks(
        [{ name: 'validprovider', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('validprovider') &&
            (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      const service = await getMessengerServiceByProvider('validprovider');

      expect(service).toBeDefined();
      expect(service).toBe(mockServiceInstance);
      expect(await isProviderRegistered('validprovider')).toBe(true);
      expect(getLoadedProviders()).toContain('validprovider');
    });

    it('should return cached provider on subsequent calls', async () => {
      setupFsMocks(
        [{ name: 'validprovider', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('validprovider') &&
            (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      const service1 = await getMessengerServiceByProvider('validprovider');
      expect(service1).toBe(mockServiceInstance);

      // Clear readdir mock to ensure it's not called again (discovery cached)
      (mockFsPromises.readdir as jest.Mock).mockClear();

      const service2 = await getMessengerServiceByProvider('validprovider');
      expect(service2).toBe(mockServiceInstance);
      expect(mockFsPromises.readdir).not.toHaveBeenCalled();
    });

    it('should return null for non-existent provider', async () => {
      setupFsMocks([]);

      await refreshProviders();

      const service = await getMessengerServiceByProvider('nonexistent');
      expect(service).toBeNull();
    });

    it('should return null if provider has no valid factory', async () => {
      setupFsMocks(
        [{ name: 'missingfactory', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('missingfactory') &&
            (p.endsWith('MissingfactoryService.ts') || p.endsWith('MissingfactoryService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      const service = await getMessengerServiceByProvider('missingfactory');
      expect(service).toBeNull();
    });

    it('should return null if provider service instance is invalid', async () => {
      setupFsMocks(
        [{ name: 'invalidservice', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('invalidservice') &&
            (p.endsWith('InvalidserviceService.ts') || p.endsWith('InvalidserviceService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      const service = await getMessengerServiceByProvider('invalidservice');
      expect(service).toBeNull();
    });
  });

  describe('Management', () => {
    it('should unload provider', async () => {
      setupFsMocks(
        [{ name: 'validprovider', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('validprovider') &&
            (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      await getMessengerServiceByProvider('validprovider');
      expect(getLoadedProviders()).toContain('validprovider');

      unloadProvider('validprovider');
      expect(getLoadedProviders()).not.toContain('validprovider');
    });

    it('should refresh providers', async () => {
      // Initial state
      setupFsMocks([{ name: 'validprovider', isDirectory: () => true }]);

      await refreshProviders();

      expect(await isProviderRegistered('validprovider')).toBe(true);

      (mockFsPromises.readdir as jest.Mock).mockClear();

      // Change FS state
      setupFsMocks(
        [{ name: 'newprovider', isDirectory: () => true }],
        (p: string) => {
          if (p.endsWith('integrations')) return true;
          if (
            p.includes('newprovider') &&
            (p.endsWith('NewproviderService.ts') || p.endsWith('NewproviderService.js'))
          )
            return true;
          return false;
        }
      );

      await refreshProviders();

      expect(mockFsPromises.readdir).toHaveBeenCalledTimes(1);
      expect(await isProviderRegistered('newprovider')).toBe(true);
      expect(await isProviderRegistered('validprovider')).toBe(false);
    });
  });
});
