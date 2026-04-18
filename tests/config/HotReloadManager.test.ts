import fs from 'fs';
import path from 'path';
import { HotReloadManager } from '../../src/config/HotReloadManager';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    watch: jest.fn().mockReturnValue({ close: jest.fn() }),
    existsSync: jest.fn().mockReturnValue(true),
  };
});

jest.mock('../../src/config/BotConfigurationManager', () => {
  const mockMgr = {
    getAllBots: jest.fn().mockReturnValue([]),
  };
  return {
    BotConfigurationManager: {
      getInstance: jest.fn(() => mockMgr),
    },
  };
});

describe('HotReloadManager', () => {
  let manager: HotReloadManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset singleton
    (HotReloadManager as any).instance = undefined;
    manager = HotReloadManager.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be a singleton', () => {
    const s2 = HotReloadManager.getInstance();
    expect(manager).toBe(s2);
  });

  it('should initialize file watchers on creation', () => {
    expect(fs.watch).toHaveBeenCalled();
  });

  it('should debounce file changes', () => {
    // Accessing private method for testing purposes
    const spy = jest.spyOn(manager as any, 'detectConfigurationChanges');
    
    // Simulate a file change
    (manager as any).handleFileChange('change', 'config.json');
    
    // Should not have triggered yet
    expect(spy).not.toHaveBeenCalled();
    
    // Fast-forward time
    jest.advanceTimersByTime(1500);
    
    expect(spy).toHaveBeenCalled();
  });

  it('should detect configuration changes correctly', () => {
    const botMgr = BotConfigurationManager.getInstance();
    botMgr.getAllBots.mockReturnValue([{ name: 'bot-1' }]);
    
    (manager as any).detectConfigurationChanges();
    
    expect(botMgr.getAllBots).toHaveBeenCalled();
  });
});
