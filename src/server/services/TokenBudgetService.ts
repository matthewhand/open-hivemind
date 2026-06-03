import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { CostAnalyticsService } from './CostAnalyticsService';

const debug = Debug('app:TokenBudgetService');

export interface BotTokenUsage {
  botId: string;
  dailyUsage: number;
  lastUsed: string;
  day: string; // YYYY-MM-DD
}

interface TokenBudgetData {
  bots: Record<string, BotTokenUsage>;
  lastUpdated: string;
}

export class TokenBudgetService {
  private static instance: TokenBudgetService;
  private dataFile: string;
  private data: TokenBudgetData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000;

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = path.join(dataDir, 'bot-token-usage.json');
    this.data = {
      bots: {},
      lastUpdated: new Date().toISOString(),
    };
    this.initializeData();
  }

  public static getInstance(): TokenBudgetService {
    if (!TokenBudgetService.instance) {
      TokenBudgetService.instance = new TokenBudgetService();
    }
    return TokenBudgetService.instance;
  }

  private async initializeData(): Promise<void> {
    const dataDir = path.dirname(this.dataFile);
    try {
      if (!fs.existsSync(dataDir)) {
        await fs.promises.mkdir(dataDir, { recursive: true });
      }
      await this.loadData();
    } catch (e) {
      debug('Failed to initialize token budget service: %O', e);
    }
  }

  private async loadData(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return;
      }
      const content = await fs.promises.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(content) as Partial<TokenBudgetData>;

      this.data = {
        bots: parsed.bots || {},
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };

      debug('Loaded token usage data for %d bots', Object.keys(this.data.bots).length);
    } catch (error) {
      debug('Failed to load token usage data: %O', error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData().catch((err) => debug('Failed to save token usage data: %O', err));
    }, this.SAVE_DEBOUNCE_MS);
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      const content = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(this.dataFile, content, 'utf8');
    } catch (error) {
      debug('Failed to save token usage data: %O', error);
    }
  }

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Increment token usage for a bot
   */
  public async incrementUsage(botId: string, tokens: number, model?: string): Promise<number> {
    const today = this.getTodayString();

    if (!this.data.bots[botId] || this.data.bots[botId].day !== today) {
      this.data.bots[botId] = {
        botId,
        dailyUsage: 0,
        lastUsed: new Date().toISOString(),
        day: today,
      };
    }

    const usage = this.data.bots[botId];
    usage.dailyUsage += tokens;
    usage.lastUsed = new Date().toISOString();

    if (model) {
      const costService = CostAnalyticsService.getInstance();
      await costService.recordCost(botId, model, tokens);
    }

    this.scheduleSave();
    return usage.dailyUsage;
  }

  /**
   * Get current daily usage for a bot
   */
  public getDailyUsage(botId: string): number {
    const today = this.getTodayString();
    const usage = this.data.bots[botId];

    if (!usage || usage.day !== today) {
      return 0;
    }

    return usage.dailyUsage;
  }

  /**
   * Check if a bot has exceeded its daily token budget
   */
  public isOverBudget(botId: string, limit: number): boolean {
    if (!limit || limit <= 0) return false;
    return this.getDailyUsage(botId) > limit;
  }

  /**
   * Reset usage for a bot (e.g. manually)
   */
  public async resetUsage(botId: string): Promise<void> {
    const today = this.getTodayString();
    this.data.bots[botId] = {
      botId,
      dailyUsage: 0,
      lastUsed: new Date().toISOString(),
      day: today,
    };
    await this.saveData();
  }
}
