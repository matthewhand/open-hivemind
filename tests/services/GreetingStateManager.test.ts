import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises
jest.mock('fs/promises');

// Mock path
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
  };
});

// Mock Logger
jest.mock('../../src/common/logger', () => {
  const mockInfo = jest.fn();
  const mockError = jest.fn();
  const mockWarn = jest.fn();
  const mockDebug = jest.fn();

  return {
    __esModule: true,
    default: {
      withContext: jest.fn(() => ({
        info: mockInfo,
        error: mockError,
        warn: mockWarn,
        debug: mockDebug,
      })),
    },
    // Expose spies for testing
    mockInfo,
    mockError,
    mockWarn,
    mockDebug,
  };
});

// Import after mocks
import { GreetingStateManager } from '../../src/services/GreetingStateManager';
import * as LoggerModule from '../../src/common/logger';

const { mockInfo, mockError } = LoggerModule as any;

describe('GreetingStateManager', () => {
  let stateManager: GreetingStateManager;
  const mockStatePath = '/app/data/greeting-state.json';
  const mockDataDir = '/app/data';

  beforeEach(() => {
    // Reset singleton instance
    (GreetingStateManager as any).instance = null;
    jest.clearAllMocks();

    // Setup default mock implementation
    (path.join as jest.Mock).mockReturnValue(mockStatePath);
    (path.dirname as jest.Mock).mockReturnValue(mockDataDir);
    (fs.access as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('{}');
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

    stateManager = GreetingStateManager.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = GreetingStateManager.getInstance();
      const instance2 = GreetingStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully when file exists', async () => {
      const existingState = {
        'service-1': { timestamp: Date.now(), channelId: 'channel-1' },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingState));

      await stateManager.initialize();

      expect(fs.access).toHaveBeenCalledWith(mockDataDir);
      expect(fs.readFile).toHaveBeenCalledWith(mockStatePath, 'utf-8');
      expect(mockInfo).toHaveBeenCalledWith('GreetingStateManager initialized successfully');
      expect((stateManager as any).state).toEqual(existingState);
    });

    it('should create directory if it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValueOnce(new Error('ENOENT'));

      await stateManager.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(mockDataDir, { recursive: true });
      expect(mockInfo).toHaveBeenCalledWith(
        'Created data directory for greeting state',
        expect.any(Object)
      );
    });

    it('should start with empty state if file does not exist', async () => {
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';
      (fs.readFile as jest.Mock).mockRejectedValueOnce(error);

      await stateManager.initialize();

      expect((stateManager as any).state).toEqual({});
      expect(mockInfo).toHaveBeenCalledWith('No existing greeting state file found, starting fresh');
    });

    it('should handle other file read errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));

      await stateManager.initialize();

      expect((stateManager as any).state).toEqual({});
      expect(mockError).toHaveBeenCalledWith(
        'Failed to initialize GreetingStateManager',
        expect.any(Object)
      );
    });

    it('should clean up expired entries during initialization', async () => {
      const now = Date.now();
      const expiredTimestamp = now - (25 * 60 * 60 * 1000); // 25 hours ago
      const validTimestamp = now - (1 * 60 * 60 * 1000); // 1 hour ago

      const stateWithExpired = {
        'expired-service': { timestamp: expiredTimestamp, channelId: 'channel-1' },
        'valid-service': { timestamp: validTimestamp, channelId: 'channel-2' },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(stateWithExpired));

      await stateManager.initialize();

      const state = (stateManager as any).state;
      expect(state['expired-service']).toBeUndefined();
      expect(state['valid-service']).toBeDefined();
      expect(mockInfo).toHaveBeenCalledWith(
        'Cleaned up expired greeting state entries',
        expect.any(Object)
      );
    });

    it('should log error if saving state fails during cleanup', async () => {
      const now = Date.now();
      const expiredTimestamp = now - (25 * 60 * 60 * 1000);
      const stateWithExpired = {
        'expired-service': { timestamp: expiredTimestamp, channelId: 'channel-1' },
      };
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(stateWithExpired));
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      await stateManager.initialize();

      // Wait for async operations to complete
      await new Promise(process.nextTick);

      expect(mockError).toHaveBeenCalledWith(
        'Failed to save state after cleanup',
        expect.any(Object)
      );
    });
  });

  describe('hasGreetingBeenSent', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    it('should throw if not initialized', () => {
      (stateManager as any).initialized = false;
      expect(() => stateManager.hasGreetingBeenSent('service-1')).toThrow(
        'GreetingStateManager must be initialized before use'
      );
    });

    it('should return false if service not found', () => {
      expect(stateManager.hasGreetingBeenSent('unknown-service')).toBe(false);
    });

    it('should return true if service found and not expired', () => {
      const serviceId = 'service-1';
      (stateManager as any).state[serviceId] = {
        timestamp: Date.now(),
        channelId: 'channel-1',
      };

      expect(stateManager.hasGreetingBeenSent(serviceId)).toBe(true);
    });

    it('should return false and remove entry if expired', async () => {
      const serviceId = 'expired-service';
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      (stateManager as any).state[serviceId] = {
        timestamp: expiredTimestamp,
        channelId: 'channel-1',
      };

      const result = stateManager.hasGreetingBeenSent(serviceId);

      expect(result).toBe(false);
      expect((stateManager as any).state[serviceId]).toBeUndefined();
      // Wait for async saveState called inside hasGreetingBeenSent
      await new Promise(process.nextTick);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should log error if saving state fails after expiration removal', async () => {
      const serviceId = 'expired-service';
      const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      (stateManager as any).state[serviceId] = {
        timestamp: expiredTimestamp,
        channelId: 'channel-1',
      };
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      stateManager.hasGreetingBeenSent(serviceId);

      await new Promise(process.nextTick);

      expect(mockError).toHaveBeenCalledWith(
        'Failed to save state after expiration',
        expect.any(Object)
      );
    });
  });

  describe('markGreetingAsSent', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    it('should update state and save to file', async () => {
      const serviceId = 'new-service';
      const channelId = 'channel-1';

      await stateManager.markGreetingAsSent(serviceId, channelId);

      const state = (stateManager as any).state;
      expect(state[serviceId]).toBeDefined();
      expect(state[serviceId].channelId).toBe(channelId);
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockStatePath,
        expect.any(String),
        'utf-8'
      );
      expect(mockInfo).toHaveBeenCalledWith('Marked greeting as sent', { serviceId, channelId });
    });

    it('should log error if saveState fails', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));
      const serviceId = 'new-service';
      const channelId = 'channel-1';

      await expect(stateManager.markGreetingAsSent(serviceId, channelId)).rejects.toThrow('Write failed');

      expect(mockError).toHaveBeenCalledWith(
        'Failed to save greeting state',
        expect.any(Object)
      );
    });
  });

  describe('getServiceState', () => {
    beforeEach(async () => {
      await stateManager.initialize();
    });

    it('should return state for existing service', () => {
      const serviceId = 'service-1';
      const entry = { timestamp: Date.now(), channelId: 'channel-1' };
      (stateManager as any).state[serviceId] = entry;

      expect(stateManager.getServiceState(serviceId)).toEqual(entry);
    });

    it('should return null for non-existing service', () => {
      expect(stateManager.getServiceState('unknown')).toBeNull();
    });
  });

  describe('clearAllState', () => {
    beforeEach(async () => {
      await stateManager.initialize();
      (stateManager as any).state['some-service'] = { timestamp: Date.now(), channelId: '1' };
    });

    it('should clear all state and save', async () => {
      await stateManager.clearAllState();

      expect((stateManager as any).state).toEqual({});
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockStatePath,
        '{}',
        'utf-8'
      );
      expect(mockInfo).toHaveBeenCalledWith('Cleared all greeting state');
    });
  });

  describe('getAllState', () => {
     beforeEach(async () => {
      await stateManager.initialize();
    });

    it('should return a copy of the state', () => {
      const serviceId = 'service-1';
      const entry = { timestamp: Date.now(), channelId: 'channel-1' };
      (stateManager as any).state[serviceId] = entry;

      const allState = stateManager.getAllState();
      expect(allState).toEqual({ [serviceId]: entry });
      expect(allState).not.toBe((stateManager as any).state); // Should be a copy
    });
  });
});
