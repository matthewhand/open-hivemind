import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:BotMetricsService');

export interface BotMetrics {
  messageCount: number;
  errorCount: number;
  lastActive?: string;
}

export class BotMetricsService {
  private static instance: BotMetricsService;
  private metricsPath: string;
  private metrics: Record<string, BotMetrics> = {};
  private saveInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Store metrics in config/user/bot-metrics.json
    this.metricsPath = path.join(process.cwd(), 'config', 'user', 'bot-metrics.json');
    this.loadMetrics();
    this.startAutoSave();
  }

  public static getInstance(): BotMetricsService {
    if (!BotMetricsService.instance) {
      BotMetricsService.instance = new BotMetricsService();
    }
    return BotMetricsService.instance;
  }

  private loadMetrics(): void {
    try {
      if (fs.existsSync(this.metricsPath)) {
        const data = fs.readFileSync(this.metricsPath, 'utf-8');
        this.metrics = JSON.parse(data);
        debug('Loaded bot metrics from disk');
      }
    } catch (error) {
      debug('Failed to load bot metrics:', error);
      this.metrics = {};
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      const dir = path.dirname(this.metricsPath);
      // We can use sync check/mkdir here as it's rare, but async is better practice
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(this.metricsPath, JSON.stringify(this.metrics, null, 2));
      debug('Saved bot metrics to disk');
    } catch (error) {
      debug('Failed to save bot metrics:', error);
    }
  }

  private startAutoSave(): void {
    // Save every minute
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this.saveInterval = setInterval(() => {
      this.saveMetrics().catch((err) => {
        debug('Error in auto-save:', err);
      });
    }, 60000);
  }

  public incrementMessageCount(botName: string): void {
    if (!this.metrics[botName]) {
      this.metrics[botName] = { messageCount: 0, errorCount: 0 };
    }
    this.metrics[botName].messageCount++;
    this.metrics[botName].lastActive = new Date().toISOString();
  }

  public incrementErrorCount(botName: string): void {
    if (!this.metrics[botName]) {
      this.metrics[botName] = { messageCount: 0, errorCount: 0 };
    }
    this.metrics[botName].errorCount++;
    this.metrics[botName].lastActive = new Date().toISOString();
  }

  public getMetrics(botName: string): BotMetrics {
    return this.metrics[botName] || { messageCount: 0, errorCount: 0 };
  }

  public getAllMetrics(): Record<string, BotMetrics> {
    return { ...this.metrics };
  }

  public stop(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    // Final save attempt (fire and forget as we might be shutting down)
    this.saveMetrics().catch(() => {});
  }
}
