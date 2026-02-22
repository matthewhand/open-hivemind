import fs from 'fs/promises';
import path from 'path';
import { GreetingStateManager } from '@services/GreetingStateManager';
import Logger from '@common/logger';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('@common/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    withContext: jest.fn().mockReturnValue(mockLogger),
    // Add these just in case they are called directly
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
});

// Helper to access private members for testing/resetting
const getPrivateInstance = () => {
  return (GreetingStateManager as any).instance;
};

const setPrivateInstance = (instance: any) => {
  (GreetingStateManager as any).instance = instance;
};

describe('GreetingStateManager', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockLogger = Logger.withContext('test'); // get the mock logger object

  const TEST_CWD = '/test/app';
  const EXPECTED_STATE_PATH = path.join(TEST_CWD, 'data', 'greeting-state.json');
  const EXPECTED_DATA_DIR = path.join(TEST_CWD, 'data');

  // Spy on process.cwd
  let cwdSpy: jest.SpyInstance;
  // Mock Date.now
  let dateSpy: jest.SpyInstance;
  const NOW = 1600000000000; // arbitrary timestamp

  beforeEach(() => {
    // Reset singleton instance
    setPrivateInstance(undefined);

    // Reset mocks
    jest.clearAllMocks();

    // Mock cwd
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(TEST_CWD);

    // Mock Date.now
    dateSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);

    // Default fs behavior
    mockFs.access.mockResolvedValue(undefined); // Directory exists
    mockFs.readFile.mockResolvedValue('{}'); // Empty state file
    mockFs.writeFile.mockResolvedValue(undefined); // Write succeeds
    mockFs.mkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    dateSpy.mockRestore();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GreetingStateManager.getInstance();
      const instance2 = GreetingStateManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully when file exists', async () => {
      const initialState = {
        'service-1': { timestamp: NOW - 1000, channelId: 'chan-1' },
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(initialState));

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      expect(mockFs.access).toHaveBeenCalledWith(EXPECTED_DATA_DIR);
      expect(mockFs.readFile).toHaveBeenCalledWith(EXPECTED_STATE_PATH, 'utf-8');
      expect(manager.getAllState()).toEqual(initialState);
    });

    it('should create directory if it does not exist', async () => {
      // access fails first (dir missing), then mkdir called
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'));

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(EXPECTED_DATA_DIR, { recursive: true });
    });

    it('should handle missing state file (ENOENT) gracefully', async () => {
      const error: any = new Error('File not found');
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      expect(manager.getAllState()).toEqual({});
      // Should not log error, but info
      expect(mockLogger.info).toHaveBeenCalledWith(
        'No existing greeting state file found, starting fresh'
      );
    });

    it('should handle other file read errors by starting with empty state and logging error', async () => {
      const error = new Error('Permission denied');
      mockFs.readFile.mockRejectedValue(error);

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      expect(manager.getAllState()).toEqual({});
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize GreetingStateManager', {
        error,
      });
    });

    it('should not re-initialize if already initialized', async () => {
      const manager = GreetingStateManager.getInstance();
      await manager.initialize();
      mockFs.readFile.mockClear();

      await manager.initialize();
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should clean up expired entries during initialization', async () => {
      const expiredTime = NOW - 24 * 60 * 60 * 1000 - 1; // 24h + 1ms ago
      const validTime = NOW - 1000;

      const initialState = {
        'expired-service': { timestamp: expiredTime, channelId: 'chan-1' },
        'valid-service': { timestamp: validTime, channelId: 'chan-2' },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(initialState));

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      const state = manager.getAllState();
      expect(state).not.toHaveProperty('expired-service');
      expect(state).toHaveProperty('valid-service');

      // Should trigger a save after cleanup
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should log error if saving state fails after cleanup during initialization', async () => {
      const expiredTime = NOW - 25 * 60 * 60 * 1000;
      mockFs.readFile.mockResolvedValue(
        JSON.stringify({
          'expired-service': { timestamp: expiredTime, channelId: 'chan-1' },
        })
      );

      // Mock write failure
      const error = new Error('Write failed');
      mockFs.writeFile.mockRejectedValue(error);

      const manager = GreetingStateManager.getInstance();
      await manager.initialize();

      // Wait for async operations (cleanupExpiredEntries calls saveState without await)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save state after cleanup',
        expect.objectContaining({ error })
      );
    });
  });

  describe('State Operations', () => {
    let manager: GreetingStateManager;

    beforeEach(async () => {
      manager = GreetingStateManager.getInstance();
      await manager.initialize();
      mockFs.writeFile.mockClear(); // Clear initialization writes
    });

    describe('hasGreetingBeenSent', () => {
      it('should throw error if not initialized', () => {
        // Reset instance to uninitialized state
        setPrivateInstance(undefined);
        const newManager = GreetingStateManager.getInstance();

        expect(() => newManager.hasGreetingBeenSent('service-1')).toThrow(
          'GreetingStateManager must be initialized before use'
        );
      });

      it('should return false if service not in state', () => {
        expect(manager.hasGreetingBeenSent('unknown-service')).toBe(false);
      });

      it('should return true if service in state and not expired', () => {
        // Manually inject state (since markGreetingAsSent is async and we want to control timestamp)
        // Accessing private state isn't easy, so we'll use markGreetingAsSent then verify
        // But for this test, let's mock the state via initial load or manipulate it if we could.
        // Since we can't easily manipulate private state, let's use markGreetingAsSent

        // Wait, markGreetingAsSent uses Date.now(), which we mocked.
        return manager.markGreetingAsSent('service-1', 'chan-1').then(() => {
          expect(manager.hasGreetingBeenSent('service-1')).toBe(true);
        });
      });

      it('should return false and remove entry if expired', async () => {
        // 1. Setup initial state with an expired entry
        const expiredTime = NOW - 24 * 60 * 60 * 1000 - 100;
        // We need to re-initialize to inject this state easily
        setPrivateInstance(undefined);
        mockFs.readFile.mockResolvedValue(
          JSON.stringify({
            'expired-service': { timestamp: expiredTime, channelId: 'chan-1' },
          })
        );

        manager = GreetingStateManager.getInstance();
        // Skip auto-cleanup during init for this test?
        // No, init calls cleanupExpiredEntries. So it will be removed during init.
        // We need to test the logic inside hasGreetingBeenSent.
        // So we need an entry that is VALID during init, but EXPIRED when we call hasGreetingBeenSent.

        // Approach:
        // 1. Init with valid entry (timestamp = NOW)
        // 2. Advance mocked time (NOW + 25h)
        // 3. Call hasGreetingBeenSent

        mockFs.readFile.mockResolvedValue(
          JSON.stringify({
            'service-to-expire': { timestamp: NOW, channelId: 'chan-1' },
          })
        );

        await manager.initialize();

        // Advance time
        dateSpy.mockReturnValue(NOW + 25 * 60 * 60 * 1000);

        expect(manager.hasGreetingBeenSent('service-to-expire')).toBe(false);

        // Verify it was removed (save called)
        expect(mockFs.writeFile).toHaveBeenCalled();
        const state = manager.getAllState();
        expect(state['service-to-expire']).toBeUndefined();
      });

      it('should log error if saving state fails after expiration removal', async () => {
        // Reset instance to force re-initialization
        setPrivateInstance(undefined);

        // Setup valid entry that will expire
        mockFs.readFile.mockResolvedValue(
          JSON.stringify({
            'service-to-expire': { timestamp: NOW, channelId: 'chan-1' },
          })
        );

        manager = GreetingStateManager.getInstance();
        await manager.initialize();

        expect(manager.getAllState()).toHaveProperty('service-to-expire');
        expect(mockFs.writeFile).not.toHaveBeenCalled();

        // Advance time to expire the entry
        dateSpy.mockReturnValue(NOW + 25 * 60 * 60 * 1000);

        // Mock write failure
        const error = new Error('Write failed');
        mockFs.writeFile.mockImplementation(() => Promise.reject(error));

        // Call method
        const result = manager.hasGreetingBeenSent('service-to-expire');
        expect(result).toBe(false);

        // Wait for async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(mockFs.writeFile).toHaveBeenCalled();

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to save state after expiration',
          expect.objectContaining({ error, serviceId: 'service-to-expire' })
        );
      });
    });

    describe('markGreetingAsSent', () => {
      it('should update state and save to file', async () => {
        await manager.markGreetingAsSent('service-new', 'chan-new');

        const state = manager.getAllState();
        expect(state['service-new']).toEqual({
          timestamp: NOW,
          channelId: 'chan-new',
        });

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          EXPECTED_STATE_PATH,
          expect.stringContaining('"service-new"'),
          'utf-8'
        );
      });

      it('should propagate save errors', async () => {
        const error = new Error('Write failed');
        mockFs.writeFile.mockRejectedValueOnce(error);

        // It should propagate the error
        await expect(manager.markGreetingAsSent('service-fail', 'chan-fail')).rejects.toThrow(
          'Write failed'
        );

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to save greeting state',
          expect.objectContaining({ error })
        );
      });
    });

    describe('getServiceState', () => {
      it('should return null for unknown service', () => {
        expect(manager.getServiceState('unknown')).toBeNull();
      });

      it('should return state for known service', async () => {
        await manager.markGreetingAsSent('known', 'chan-1');
        const state = manager.getServiceState('known');
        expect(state).toEqual({ timestamp: NOW, channelId: 'chan-1' });
      });
    });

    describe('clearAllState', () => {
      it('should clear state and save empty object', async () => {
        await manager.markGreetingAsSent('s1', 'c1');
        await manager.clearAllState();

        expect(manager.getAllState()).toEqual({});
        expect(mockFs.writeFile).toHaveBeenCalledWith(EXPECTED_STATE_PATH, '{}', 'utf-8');
      });
    });
  });
});
