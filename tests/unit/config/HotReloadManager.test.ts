import { HotReloadManager } from '../../../src/config/HotReloadManager';
import { BotConfigurationManager } from '../../../src/config/BotConfigurationManager';
import { UserConfigStore } from '../../../src/config/UserConfigStore';
import { WebSocketService } from '../../../src/server/services/WebSocketService';
import { ErrorUtils } from '../../../src/types/errors';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('../../../src/config/BotConfigurationManager');
jest.mock('../../../src/config/UserConfigStore');
jest.mock('../../../src/server/services/WebSocketService');
jest.mock('../../../src/types/errors');
jest.mock('fs');


describe('HotReloadManager', () => {
  let hotReloadManager: HotReloadManager;

  beforeEach(() => {
    // @ts-ignore
    HotReloadManager.instance = undefined;
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const mockWatcher = { close: jest.fn() };
    (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

    const mockUserConfigStore = {
      setBotOverride: jest.fn(),
    };
    (UserConfigStore.getInstance as jest.Mock).mockReturnValue(mockUserConfigStore);

    const mockBotConfigurationManager = {
      getAllBots: jest.fn().mockReturnValue([{ name: 'test-bot' }, { name: 'test-bot-2' }]),
      getBot: jest.fn().mockImplementation((name) => name === 'test-bot' ? { name: 'test-bot' } : undefined),
      reload: jest.fn(),
    };
    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigurationManager);

    const mockWebSocketService = {
      recordAlert: jest.fn(),
      broadcastConfigChange: jest.fn(),
    };
    (WebSocketService.getInstance as jest.Mock).mockReturnValue(mockWebSocketService);

    (ErrorUtils.toHivemindError as jest.Mock).mockImplementation((e) => ({ message: e?.message || 'Error', code: 'ERR' }));
    (ErrorUtils.classifyError as jest.Mock).mockReturnValue({ type: 'System', severity: 'Error' });

    hotReloadManager = HotReloadManager.getInstance();
  });

  afterEach(() => {
    hotReloadManager.shutdown();
  });

  describe('Initialization', () => {
    it('should create file watchers for config directories', () => {
      expect(fs.watch).toHaveBeenCalledTimes(2);
      expect(fs.watch).toHaveBeenCalledWith(path.join(process.cwd(), 'config'), { recursive: true }, expect.any(Function));
      expect(fs.watch).toHaveBeenCalledWith(path.join(process.cwd(), 'config', 'user'), { recursive: true }, expect.any(Function));
    });

    it('should handle fs.watch errors gracefully', () => {
      // @ts-ignore
      HotReloadManager.instance = undefined;
      (fs.watch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Watch error');
      });
      const manager = HotReloadManager.getInstance();
      expect(manager).toBeDefined();
    });
  });

  describe('File Changes', () => {
    it('should handle file change event', () => {
      jest.useFakeTimers();
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][2];
      watchCallback('change', 'config.json');
      jest.advanceTimersByTime(1100);
      expect(BotConfigurationManager.getInstance().getAllBots).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should handle file change with non-json/js files', () => {
      jest.useFakeTimers();
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][2];
      watchCallback('change', 'config.txt');
      jest.advanceTimersByTime(1100);
      expect(BotConfigurationManager.getInstance().getAllBots).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('should handle detectConfigurationChanges error gracefully', () => {
      jest.useFakeTimers();
      const watchCallback = (fs.watch as jest.Mock).mock.calls[0][2];
      const mockManager = BotConfigurationManager.getInstance();
      (mockManager.getAllBots as jest.Mock).mockImplementation(() => { throw new Error('Test Error') });
      watchCallback('change', 'config.json');
      expect(() => {
        jest.advanceTimersByTime(1100);
      }).not.toThrow();
      jest.useRealTimers();
    });
  });

  describe('applyConfigurationChange', () => {
    const validChange = {
      type: 'update' as const,
      botName: 'test-bot',
      changes: { messageProvider: 'slack', llmProvider: 'openai' }
    };

    it('should reject if a reload is already in progress', async () => {
      const change1Promise = hotReloadManager.applyConfigurationChange(validChange);
      const result = await hotReloadManager.applyConfigurationChange(validChange);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Hot reload already in progress');
      await change1Promise;
    });

    it('should reject if validation fails (invalid bot)', async () => {
      const result = await hotReloadManager.applyConfigurationChange({
        ...validChange,
        botName: 'non-existent-bot'
      });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Configuration change validation failed');
      expect(result.errors).toContain("Bot 'non-existent-bot' not found");
    });

    it('should apply valid change to a specific bot successfully', async () => {
      const result = await hotReloadManager.applyConfigurationChange({
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack', llmProvider: 'openai' }
      });
      expect(result.success).toBe(true);
      expect(result.affectedBots).toContain('test-bot');
    });

    it('should apply global change successfully', async () => {
      const globalChange = {
        type: 'update' as const,
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(globalChange);
      expect(result.success).toBe(true);
      expect(result.affectedBots).toContain('test-bot');
    });

    it('should add warnings when global changes fail for some bots', async () => {
      const mockStore = UserConfigStore.getInstance();
      (mockStore.setBotOverride as jest.Mock).mockImplementation((botName) => {
        if (botName === 'test-bot-2') throw new Error('Store error');
      });
      const globalChange = {
        type: 'update' as const,
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(globalChange);
      expect(result.warnings).toContain("Failed to apply changes to bot 'test-bot-2'");
    });

    it('should rollback if application fails', async () => {
      const mockStore = UserConfigStore.getInstance();
      (mockStore.setBotOverride as jest.Mock).mockImplementation(() => {
        throw new Error('Store error');
      });
      const result = await hotReloadManager.applyConfigurationChange(validChange);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Failed to apply changes to bot 'test-bot'");
    });

    it('should handle unexpected errors during process', async () => {
      // We can trigger an unexpected error by causing validateChange to throw internally
      // and checking if `catch (error: unknown)` in applyConfigurationChange is hit.
      // Actually validateChange catches internally and returns `{ valid: false, errors: [...] }`.
      // To throw in applyConfigurationChange, we can spy on it or modify `Date.now` to throw?
      // No, `Math.random`?
      // Better to throw from `this.validateChange` using spy.
      const spy = jest.spyOn(hotReloadManager as any, 'validateChange').mockImplementation(() => {
        throw new Error('Unexpected validate error');
      });

      const result = await hotReloadManager.applyConfigurationChange({ ...validChange });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unexpected error during configuration change');

      spy.mockRestore();
    });
  });

  describe('rollbackToSnapshot', () => {
    it('should return false for non-existent snapshot', async () => {
      const result = await hotReloadManager.rollbackToSnapshot('non-existent');
      expect(result).toBe(false);
    });

    it('should successfully rollback and delete snapshot', async () => {
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      const applyResult = await hotReloadManager.applyConfigurationChange(change);
      const result = await hotReloadManager.rollbackToSnapshot(applyResult.rollbackId as string);
      expect(result).toBe(true);
    });

    it('should handle rollback error gracefully', async () => {
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      const applyResult = await hotReloadManager.applyConfigurationChange(change);
      const managerAny = hotReloadManager as any;
      jest.spyOn(managerAny.rollbackSnapshots, 'get').mockImplementation(() => {
        throw new Error('Rollback Get Error');
      });
      const result = await hotReloadManager.rollbackToSnapshot(applyResult.rollbackId as string);
      expect(result).toBe(false);
    });
  });

  describe('createRollbackSnapshot error', () => {
    it('should return null when createRollbackSnapshot fails globally', async () => {
      const mockManager = BotConfigurationManager.getInstance();
      (mockManager.getAllBots as jest.Mock).mockImplementation(() => { throw new Error('Snap Error') });
      const change = {
        type: 'update' as const,
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.rollbackId).toBeUndefined();
    });

    it('should return null when createRollbackSnapshot fails for specific bot', async () => {
      const mockManager = BotConfigurationManager.getInstance();
      // Ensure it throws when creating snapshot (after validation)
      (mockManager.getBot as jest.Mock).mockImplementationOnce(() => ({ name: 'test-bot' })); // for validateChange
      (mockManager.getBot as jest.Mock).mockImplementationOnce(() => { throw new Error('Snap Error Bot') }); // for createRollbackSnapshot

      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.rollbackId).toBeUndefined();
    });
  });

  describe('applyChange error', () => {
    it('should return error when applyChange fails completely', async () => {
      const spy = jest.spyOn(hotReloadManager as any, 'applyBotChange').mockImplementation(() => {
        throw new Error('Apply Change Fatal Error');
      });
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to apply configuration changes');
      spy.mockRestore();
    });
  });

  describe('validateChange error', () => {
    it('should catch error inside validateChange gracefully', async () => {
      const mockManager = BotConfigurationManager.getInstance();
      (mockManager.getBot as jest.Mock).mockImplementation(() => { throw new Error('Validation specific Error') });
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Configuration change validation failed');
      expect(result.errors).toContain('Validation error: Validation specific Error');
    });
  });

  describe('Helper methods', () => {
    it('should return empty available rollbacks initially', () => {
      expect(hotReloadManager.getAvailableRollbacks()).toEqual([]);
    });

    it('should respect limits in change history', async () => {
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: { messageProvider: 'slack' }
      };
      await hotReloadManager.applyConfigurationChange(change);
      await hotReloadManager.applyConfigurationChange({ ...change, changes: { llmProvider: 'openai' } });
      expect(hotReloadManager.getChangeHistory(1)).toHaveLength(1);
    });
  });

  describe('applyBotChange detail', () => {
    it('should sanitize changes and handle mcpGuard custom logic', async () => {
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: {
          invalidField: 'shouldBeIgnored',
          messageProvider: 'discord',
          mcpGuard: {
            enabled: true,
            type: 'custom',
            allowedUsers: ['user1', 'user2']
          }
        }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(true);
    });

    it('should handle mcpGuard string allowedUsers logic', async () => {
      const change = {
        type: 'update' as const,
        botName: 'test-bot',
        changes: {
          mcpGuard: {
            enabled: true,
            type: 'owner',
            allowedUsers: 'user1, user2'
          }
        }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(true);
    });

    it('should handle delete type configuration change', async () => {
      const change = {
        type: 'delete' as const,
        botName: 'test-bot',
        changes: {
          messageProvider: 'slack'
        }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(true);
      expect(result.affectedBots).toContain('test-bot');
    });

    it('should handle create type configuration change', async () => {
      const change = {
        type: 'create' as const,
        botName: 'test-bot',
        changes: {
          messageProvider: 'discord',
          llmProvider: 'openai'
        }
      };
      const result = await hotReloadManager.applyConfigurationChange(change);
      expect(result.success).toBe(true);
      expect(result.affectedBots).toContain('test-bot');
    });
  });

  describe('Shutdown error handling', () => {
    it('should handle watcher close errors gracefully', () => {
      // @ts-ignore
      HotReloadManager.instance = undefined;
      const watchMock = { close: jest.fn().mockImplementation(() => { throw new Error('Close Error') }) };
      (fs.watch as jest.Mock).mockReturnValue(watchMock);
      const manager = HotReloadManager.getInstance();
      expect(() => { manager.shutdown(); }).not.toThrow();
    });
  });
});
