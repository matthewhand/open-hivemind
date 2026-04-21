import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:CostAnalyticsService');

export interface CostRecord {
  botId: string;
  model: string;
  tokens: number;
  estimatedCost: number;
  timestamp: string;
}

interface CostAnalyticsData {
  records: CostRecord[];
  lastUpdated: string;
}

// Pricing per 1M tokens
const PRICING_MAP: Record<string, number> = {
  'gpt-4': 30.0,
  'gpt-4-turbo': 10.0,
  'gpt-3.5-turbo': 0.5,
  'claude-3-opus': 15.0,
  'claude-3-sonnet': 3.0,
  'claude-3-haiku': 0.25,
  'gemini-1.5-pro': 3.5,
  'gemini-1.5-flash': 0.075,
  'default': 5.0, // Default $5 per 1M tokens as requested
};

export class CostAnalyticsService {
  private static instance: CostAnalyticsService;
  private dataFile: string;
  private data: CostAnalyticsData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 2000;

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = path.join(dataDir, 'cost-analytics.json');
    this.data = {
      records: [],
      lastUpdated: new Date().toISOString(),
    };
    this.initializeData();
  }

  public static getInstance(): CostAnalyticsService {
    if (!CostAnalyticsService.instance) {
      CostAnalyticsService.instance = new CostAnalyticsService();
    }
    return CostAnalyticsService.instance;
  }

  private async initializeData(): Promise<void> {
    const dataDir = path.dirname(this.dataFile);
    try {
      if (!fs.existsSync(dataDir)) {
        await fs.promises.mkdir(dataDir, { recursive: true });
      }
      await this.loadData();
    } catch (e) {
      debug('Failed to initialize cost analytics service: %O', e);
    }
  }

  private async loadData(): Promise<void> {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return;
      }
      const content = await fs.promises.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(content) as Partial<CostAnalyticsData>;

      this.data = {
        records: parsed.records || [],
        lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      };

      debug('Loaded %d cost records', this.data.records.length);
    } catch (error) {
      debug('Failed to load cost records: %O', error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData().catch((err) => debug('Failed to save cost records: %O', err));
    }, this.SAVE_DEBOUNCE_MS);
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      // Keep only last 1000 records to prevent file from growing too large
      if (this.data.records.length > 1000) {
        this.data.records = this.data.records.slice(-1000);
      }
      const content = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(this.dataFile, content, 'utf8');
    } catch (error) {
      debug('Failed to save cost records: %O', error);
    }
  }

  public async recordCost(botId: string, model: string, tokens: number): Promise<void> {
    const pricing = PRICING_MAP[model] || PRICING_MAP['default'];
    const estimatedCost = (tokens / 1_000_000) * pricing;

    const record: CostRecord = {
      botId,
      model,
      tokens,
      estimatedCost,
      timestamp: new Date().toISOString(),
    };

    this.data.records.push(record);
    this.scheduleSave();
    
    debug('Recorded cost for bot %s: $%f (%d tokens, model %s)', botId, estimatedCost, tokens, model);
  }

  public getHistoricalCosts(days: number = 7): CostRecord[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return this.data.records.filter(r => new Date(r.timestamp) >= cutoff);
  }

  public getDailyCosts(days: number = 7): { date: string, cost: number }[] {
    const records = this.getHistoricalCosts(days);
    const dailyMap: Record<string, number> = {};

    records.forEach(r => {
      const date = r.timestamp.split('T')[0];
      dailyMap[date] = (dailyMap[date] || 0) + r.estimatedCost;
    });

    return Object.entries(dailyMap)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
