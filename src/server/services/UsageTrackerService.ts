import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('app:UsageTrackerService');

export interface ToolUsageMetrics {
  toolId: string; // Format: serverName-toolName
  serverName: string;
  toolName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  firstUsed: string;
  totalDuration: number;
  averageDuration: number;
}

export interface ProviderUsageMetrics {
  serverName: string;
  usageCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: string;
  firstUsed: string;
  totalDuration: number;
  averageDuration: number;
  toolCount: number;
}

export interface UsageUpdateData {
  toolId: string;
  serverName: string;
  toolName: string;
  success: boolean;
  duration: number;
  timestamp: string;
}

interface UsageData {
  tools: Record<string, ToolUsageMetrics>;
  providers: Record<string, ProviderUsageMetrics>;
  lastUpdated: string;
}

export class UsageTrackerService {
  private static instance: UsageTrackerService;
  private dataFile: string;
  private data: UsageData;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000; // Save after 1 second of inactivity

  private constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    this.dataFile = path.join(dataDir, 'tool-usage-metrics.json');
    this.data = {
      tools: {},
      providers: {},
      lastUpdated: new Date().toISOString(),
    };
    this.initializeData();
  }

  public static getInstance(): UsageTrackerService {
    if (!UsageTrackerService.instance) {
      UsageTrackerService.instance = new UsageTrackerService();
    }
    return UsageTrackerService.instance;
  }

  private async initializeData(): Promise<void> {
    const dataDir = path.dirname(this.dataFile);
    try {
      await fs.promises.mkdir(dataDir, { recursive: true });
      await this.loadData();
    } catch (e) {
      debug('Failed to initialize usage tracker: %O', e);
    }
  }

  private async loadData(): Promise<void> {
    try {
      await fs.promises.access(this.dataFile);
      const content = await fs.promises.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(content) as UsageData;
      this.data = parsed;
      debug(
        'Loaded usage data with %d tools and %d providers',
        Object.keys(parsed.tools).length,
        Object.keys(parsed.providers).length
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        debug('Failed to load usage data: %O', error);
      }
      // If file doesn't exist, start with empty data
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData().catch((err) => debug('Failed to save usage data: %O', err));
    }, this.SAVE_DEBOUNCE_MS);
  }

  private async saveData(): Promise<void> {
    try {
      this.data.lastUpdated = new Date().toISOString();
      const content = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(this.dataFile, content, 'utf8');
      debug(
        'Saved usage data with %d tools and %d providers',
        Object.keys(this.data.tools).length,
        Object.keys(this.data.providers).length
      );
    } catch (error) {
      debug('Failed to save usage data: %O', error);
      throw error;
    }
  }

  /**
   * Record a tool execution
   */
  public async recordUsage(update: UsageUpdateData): Promise<void> {
    const { toolId, serverName, toolName, success, duration, timestamp } = update;

    // Update tool metrics
    if (!this.data.tools[toolId]) {
      this.data.tools[toolId] = {
        toolId,
        serverName,
        toolName,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: timestamp,
        firstUsed: timestamp,
        totalDuration: 0,
        averageDuration: 0,
      };
    }

    const toolMetrics = this.data.tools[toolId];
    toolMetrics.usageCount++;
    if (success) {
      toolMetrics.successCount++;
    } else {
      toolMetrics.failureCount++;
    }
    toolMetrics.lastUsed = timestamp;
    toolMetrics.totalDuration += duration;
    toolMetrics.averageDuration = toolMetrics.totalDuration / toolMetrics.usageCount;

    // Update provider metrics
    if (!this.data.providers[serverName]) {
      this.data.providers[serverName] = {
        serverName,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: timestamp,
        firstUsed: timestamp,
        totalDuration: 0,
        averageDuration: 0,
        toolCount: 0,
      };
    }

    const providerMetrics = this.data.providers[serverName];
    providerMetrics.usageCount++;
    if (success) {
      providerMetrics.successCount++;
    } else {
      providerMetrics.failureCount++;
    }
    providerMetrics.lastUsed = timestamp;
    providerMetrics.totalDuration += duration;
    providerMetrics.averageDuration = providerMetrics.totalDuration / providerMetrics.usageCount;

    // Update tool count for provider
    const toolsForProvider = Object.values(this.data.tools).filter(
      (t) => t.serverName === serverName
    );
    providerMetrics.toolCount = toolsForProvider.length;

    this.scheduleSave();
  }

  /**
   * Get usage metrics for a specific tool
   */
  public getToolMetrics(toolId: string): ToolUsageMetrics | null {
    return this.data.tools[toolId] || null;
  }

  /**
   * Get usage metrics for all tools
   */
  public getAllToolMetrics(): ToolUsageMetrics[] {
    return Object.values(this.data.tools);
  }

  /**
   * Get usage metrics for a specific provider
   */
  public getProviderMetrics(serverName: string): ProviderUsageMetrics | null {
    return this.data.providers[serverName] || null;
  }

  /**
   * Get usage metrics for all providers
   */
  public getAllProviderMetrics(): ProviderUsageMetrics[] {
    return Object.values(this.data.providers);
  }

  /**
   * Get usage metrics for tools from a specific provider
   */
  public getToolMetricsByProvider(serverName: string): ToolUsageMetrics[] {
    return Object.values(this.data.tools).filter((tool) => tool.serverName === serverName);
  }

  /**
   * Get top N most used tools
   */
  public getTopTools(limit: number = 10): ToolUsageMetrics[] {
    return Object.values(this.data.tools)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get top N most used providers
   */
  public getTopProviders(limit: number = 10): ProviderUsageMetrics[] {
    return Object.values(this.data.providers)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Get recently used tools
   */
  public getRecentTools(limit: number = 10): ToolUsageMetrics[] {
    return Object.values(this.data.tools)
      .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
      .slice(0, limit);
  }

  /**
   * Get aggregate statistics
   */
  public getAggregateStats(): {
    totalTools: number;
    totalProviders: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    overallSuccessRate: number;
    averageDuration: number;
  } {
    const tools = Object.values(this.data.tools);
    const totalExecutions = tools.reduce((sum, t) => sum + t.usageCount, 0);
    const totalSuccesses = tools.reduce((sum, t) => sum + t.successCount, 0);
    const totalFailures = tools.reduce((sum, t) => sum + t.failureCount, 0);
    const totalDuration = tools.reduce((sum, t) => sum + t.totalDuration, 0);

    return {
      totalTools: tools.length,
      totalProviders: Object.keys(this.data.providers).length,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      overallSuccessRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      averageDuration: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
    };
  }

  /**
   * Clear all usage data
   */
  public async clearAllData(): Promise<void> {
    this.data = {
      tools: {},
      providers: {},
      lastUpdated: new Date().toISOString(),
    };
    await this.saveData();
  }

  /**
   * Force immediate save (useful for shutdown scenarios)
   */
  public async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveData();
  }

  /**
   * Shutdown and cleanup resources
   */
  public async shutdown(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    // Final save before shutdown
    await this.saveData().catch((err) => {
      debug('Failed to save data during shutdown: %O', err);
    });
    debug('UsageTrackerService shutdown completed');
  }
}
