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

// Mock fs and path
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

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

describe('ProviderRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refreshProviders();
    getLoadedProviders().forEach((p) => unloadProvider(p));
  });

  describe('Discovery', () => {
    it('should discover providers from the integrations directory', () => {
      // Mock directory structure
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        {
          name: 'validprovider',
          isDirectory: () => true,
        },
        {
          name: 'otherprovider',
          isDirectory: () => true,
        },
      ]);

      // Force refresh to trigger discovery with new mocks
      refreshProviders();

      const providers = getRegisteredProviders();

      expect(mockFs.readdirSync).toHaveBeenCalled();
    });
  });

  describe('getMessengerServiceByProvider', () => {
    it('should load and return a valid provider service', async () => {
      // Setup FS mocks for discovery
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('validprovider') &&
          (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
        )
          return true;
        return false;
      });

      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'validprovider', isDirectory: () => true },
      ]);

      // Force refresh to trigger discovery with new mocks
      refreshProviders();

      const service = await getMessengerServiceByProvider('validprovider');

      expect(service).toBeDefined();
      expect(service).toBe(mockServiceInstance);
      expect(isProviderRegistered('validprovider')).toBe(true);
      expect(getLoadedProviders()).toContain('validprovider');
    });

    it('should return cached provider on subsequent calls', async () => {
      // Setup FS mocks for discovery
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('validprovider') &&
          (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
        )
          return true;
        return false;
      });

      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'validprovider', isDirectory: () => true },
      ]);

      // Force refresh to trigger discovery with new mocks
      refreshProviders();

      const service1 = await getMessengerServiceByProvider('validprovider');
      expect(service1).toBe(mockServiceInstance);

      // Clear readdirSync mock to ensure it's not called again (discovery cached)
      (mockFs.readdirSync as jest.Mock).mockClear();

      const service2 = await getMessengerServiceByProvider('validprovider');
      expect(service2).toBe(mockServiceInstance);
      expect(mockFs.readdirSync).not.toHaveBeenCalled();
    });

    it('should return null for non-existent provider', async () => {
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([]);

      refreshProviders();

      const service = await getMessengerServiceByProvider('nonexistent');
      expect(service).toBeNull();
    });

    it('should return null if provider has no valid factory', async () => {
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('missingfactory') &&
          (p.endsWith('MissingfactoryService.ts') || p.endsWith('MissingfactoryService.js'))
        )
          return true;
        return false;
      });

      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'missingfactory', isDirectory: () => true },
      ]);

      refreshProviders();

      const service = await getMessengerServiceByProvider('missingfactory');
      expect(service).toBeNull();
    });

    it('should return null if provider service instance is invalid', async () => {
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('invalidservice') &&
          (p.endsWith('InvalidserviceService.ts') || p.endsWith('InvalidserviceService.js'))
        )
          return true;
        return false;
      });

      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'invalidservice', isDirectory: () => true },
      ]);

      refreshProviders();

      const service = await getMessengerServiceByProvider('invalidservice');
      expect(service).toBeNull();
    });
  });

  describe('Management', () => {
    it('should unload provider', async () => {
      // Setup valid provider
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('validprovider') &&
          (p.endsWith('ValidproviderService.ts') || p.endsWith('ValidproviderService.js'))
        )
          return true;
        return false;
      });
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'validprovider', isDirectory: () => true },
      ]);

      refreshProviders();

      await getMessengerServiceByProvider('validprovider');
      expect(getLoadedProviders()).toContain('validprovider');

      unloadProvider('validprovider');
      expect(getLoadedProviders()).not.toContain('validprovider');
    });

    it('should refresh providers', () => {
      // Initial state
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'validprovider', isDirectory: () => true },
      ]);

      refreshProviders();

      expect(isProviderRegistered('validprovider')).toBe(true);

      (mockFs.readdirSync as jest.Mock).mockClear();

      // Change FS state
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'newprovider', isDirectory: () => true },
      ]);
      // Also ensure newprovider file check passes
      mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
        const p = filePath.toString();
        if (p.endsWith('integrations')) return true;
        if (
          p.includes('newprovider') &&
          (p.endsWith('NewproviderService.ts') || p.endsWith('NewproviderService.js'))
        )
          return true;
        return false;
      });

      refreshProviders();

      expect(mockFs.readdirSync).toHaveBeenCalledTimes(1);
      expect(isProviderRegistered('newprovider')).toBe(true);
      expect(isProviderRegistered('validprovider')).toBe(false);
    });
  });
});
