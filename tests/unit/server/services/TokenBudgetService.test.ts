import { TokenBudgetService } from '../../../../src/server/services/TokenBudgetService';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
  existsSync: jest.fn(),
}));

describe('TokenBudgetService', () => {
  let service: TokenBudgetService;
  const mockConfigPath = path.join(process.cwd(), 'config', 'user', 'token-budget.json');

  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore - access private instance for testing
    TokenBudgetService.instance = undefined;
    service = TokenBudgetService.getInstance();
    // Force persistence mock to succeed
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Budget Tracking', () => {
    it('should initialize with zero usage for a new bot', async () => {
      const isOver = service.isOverBudget('new-bot', 1000);
      expect(isOver).toBe(false);
    });

    it('should increment usage correctly', async () => {
      await service.incrementUsage('bot-1', 500);
      await service.incrementUsage('bot-1', 300);
      
      expect(service.isOverBudget('bot-1', 1000)).toBe(false);
      expect(service.isOverBudget('bot-1', 700)).toBe(true);
    });

    it('should enforce the budget limit strictly', async () => {
      await service.incrementUsage('bot-limit', 1000);
      
      expect(service.isOverBudget('bot-limit', 1000)).toBe(false); // Exactly at limit is OK
      expect(service.isOverBudget('bot-limit', 999)).toBe(true);
    });
  });

  describe('Reset Logic', () => {
    it('should reset usage when the day changes', async () => {
      // 1. Initial usage today
      await service.incrementUsage('reset-bot', 500);
      expect(service.getDailyUsage('reset-bot')).toBe(500);

      // 2. Mock a day change by manually altering the internal data object
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      (service as any).data.bots['reset-bot'].day = yesterdayStr;
      (service as any).data.bots['reset-bot'].dailyUsage = 5000;

      // 3. getDailyUsage for today should return 0
      expect(service.getDailyUsage('reset-bot')).toBe(0);
      
      // 4. Checking if over budget should return false
      expect(service.isOverBudget('reset-bot', 1000)).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should save data to disk when usage is incremented (after debounce)', async () => {
      jest.useFakeTimers();
      await service.incrementUsage('persist-bot', 100);
      
      // Should not have called immediately due to debounce
      expect(fs.promises.writeFile).not.toHaveBeenCalled();
      
      // Fast-forward debounce
      jest.runAllTimers();
      
      expect(fs.promises.writeFile).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
