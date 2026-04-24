import fs from 'fs';
import path from 'path';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { getLlmDefaultStatus } from '../../config/llmDefaultStatus';
import { container } from '../../di/container';
import DemoModeService from '../../services/DemoModeService';
import { ActivityLogger } from './ActivityLogger';
import WebSocketService, { type MessageFlowEvent } from './WebSocketService';

export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  segments: string[];
  recommendedWidgets: string[];
  priority: number;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    behaviorPatterns: string[];
    usageFrequency: 'daily' | 'weekly' | 'monthly';
    featureUsage: string[];
    engagementLevel: 'high' | 'medium' | 'low';
  };
  characteristics: {
    preferredWidgets: string[];
    optimalLayout: string;
    themePreference: string;
    notificationFrequency: number;
  };
  size: number;
  confidence: number;
}

export interface AIDashboardConfig {
  enabled: boolean;
  learningRate: number;
  confidenceThreshold: number;
  recommendationFrequency: number;
  behaviorTracking: boolean;
  personalization: boolean;
  predictiveAnalytics: boolean;
  autoOptimization: boolean;
}

export type AnnotatedEvent = MessageFlowEvent & { llmProvider: string };

export class DashboardService {
  private static instance: DashboardService;
  private dashboardConfig: AIDashboardConfig = {
    enabled: true,
    learningRate: 0.1,
    confidenceThreshold: 0.7,
    recommendationFrequency: 30,
    behaviorTracking: true,
    personalization: true,
    predictiveAnalytics: true,
    autoOptimization: true,
  };

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  public getConfig(): AIDashboardConfig {
    return this.dashboardConfig;
  }

  public updateConfig(config: Partial<AIDashboardConfig>): AIDashboardConfig {
    this.dashboardConfig = { ...this.dashboardConfig, ...config };
    return this.dashboardConfig;
  }

  public async getTips(): Promise<string[]> {
    try {
      const tipsPath = path.join(process.cwd(), 'TIPS.md');
      try {
        await fs.promises.access(tipsPath);
      } catch {
        return [];
      }
      const raw = (await fs.promises.readFile(tipsPath, 'utf8')).trim();
      return raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  public async getAnnouncement(): Promise<{ hasAnnouncement: boolean; content: string | null }> {
    try {
      const announcementPath = path.join(process.cwd(), 'ANNOUNCEMENT.md');
      try {
        await fs.promises.access(announcementPath);
      } catch {
        return { hasAnnouncement: false, content: null };
      }
      const content = (await fs.promises.readFile(announcementPath, 'utf8')).trim();
      if (!content) {
        return { hasAnnouncement: false, content: null };
      }
      return { hasAnnouncement: true, content };
    } catch {
      return { hasAnnouncement: false, content: null };
    }
  }

  public getConfigStatus() {
    const manager = BotConfigurationManager.getInstance();
    const llmStatus = getLlmDefaultStatus();
    const llmConfigured = llmStatus.configured;

    let botConfigured = false;
    try {
      const bots = manager.getAllBots();
      botConfigured = Array.isArray(bots) && bots.length > 0;
    } catch {
      botConfigured = false;
    }

    let messengerConfigured = false;
    try {
      const bots = manager.getAllBots();
      messengerConfigured = Array.isArray(bots) && bots.some((bot) => bot.messageProvider);
    } catch {
      messengerConfigured = false;
    }

    return {
      llmConfigured,
      botConfigured,
      messengerConfigured,
    };
  }

  public getStatus() {
    const manager = BotConfigurationManager.getInstance();
    let bots: Array<{ name: string; messageProvider: string; llmProvider: string }> = [];
    try {
      bots = manager.getAllBots();
    } catch (e) {
      bots = [];
    }

    const ws = WebSocketService.getInstance();

    const status = bots
      .filter((bot) => bot && bot.name)
      .map((bot) => ({
        id: bot.name,
        name: bot.name,
        provider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        status: 'active',
        connected: this.isProviderConnected(bot),
        messageCount: ws.getBotStats(bot.name).messageCount,
        errorCount: ws.getBotStats(bot.name).errorCount,
      }));

    let demoMode = false;
    try {
      const demoService = container.resolve(DemoModeService);
      demoMode = demoService.isInDemoMode();
    } catch {
      /* ignore */
    }

    return {
      bots: status,
      uptime: process.uptime(),
      isDemoMode: demoMode,
    };
  }

  private isProviderConnected(bot: any): boolean {
    try {
      if (bot.messageProvider === 'slack') {
        const svc = require('@hivemind/message-slack').SlackService as any;
        const instance = svc?.getInstance?.();
        const mgr = instance?.getBotManager?.(bot.name) || instance?.getBotManager?.();
        const bots = mgr?.getAllBots?.() || [];
        return Array.isArray(bots) && bots.length > 0;
      }
      if (bot.messageProvider === 'discord') {
        const svc = require('@hivemind/message-discord') as any;
        const instance =
          svc?.DiscordService?.getInstance?.() || svc?.Discord?.DiscordService?.getInstance?.();
        const bots = instance?.getAllBots?.() || [];
        return Array.isArray(bots) && bots.length > 0;
      }
      return true;
    } catch {
      return true;
    }
  }

  public async getActivity(query: {
    bot?: string[];
    messageProvider?: string[];
    llmProvider?: string[];
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const manager = BotConfigurationManager.getInstance();
    const ws = WebSocketService.getInstance();

    const botList = manager.getAllBots();
    const botMap = new Map(botList.map((bot) => [bot.name, bot]));

    const botFilterSet = new Set(query.bot || []);
    const providerFilterSet = new Set(query.messageProvider || []);
    const llmFilterSet = new Set(query.llmProvider || []);

    const hasBotFilter = botFilterSet.size > 0;
    const hasProviderFilter = providerFilterSet.size > 0;
    const hasLlmFilter = llmFilterSet.size > 0;

    const fromTime = query.from?.getTime();
    const toTime = query.to?.getTime();

    const limit =
      typeof query.limit === 'number' ? query.limit : parseInt(query.limit as any, 10) || 200;
    const offset =
      typeof query.offset === 'number' ? query.offset : parseInt(query.offset as any, 10) || 0;

    const storedEvents = await ActivityLogger.getInstance().getEvents({
      startTime: query.from,
      endTime: query.to,
      limit: limit + offset,
    });

    const agents = new Set<string>();
    const messageProviders = new Set<string>();
    const llmProviders = new Set<string>();

    const hasAnyFilter = hasBotFilter || hasProviderFilter || hasLlmFilter || fromTime || toTime;

    storedEvents.forEach((event) => {
      const bot = botMap.get(event.botName);
      agents.add(event.botName);
      messageProviders.add(event.provider);
      llmProviders.add(bot?.llmProvider || 'unknown');
    });

    const filteredEvents = storedEvents.filter((event) => {
      const bot = botMap.get(event.botName);
      const eventLlmProvider = bot?.llmProvider || 'unknown';

      if (!hasAnyFilter) return true;

      if (hasBotFilter && !botFilterSet.has(event.botName)) {
        return false;
      }
      if (hasProviderFilter && !providerFilterSet.has(event.provider)) {
        return false;
      }
      if (hasLlmFilter && !llmFilterSet.has(eventLlmProvider)) {
        return false;
      }
      const ts = new Date(event.timestamp).getTime();
      if (fromTime && ts < fromTime) {
        return false;
      }
      if (toTime && ts > toTime) {
        return false;
      }
      return true;
    });

    const paginatedEvents = filteredEvents
      .slice(offset, offset + limit)
      .map((event) => this.annotateEvent(event, botMap));

    const { timeline, agentMetrics } = this.buildTimelineAndMetrics(
      paginatedEvents,
      ws.getAllBotStats()
    );

    return {
      events: paginatedEvents,
      pagination: {
        total: filteredEvents.length,
        limit,
        offset,
        hasMore: offset + limit < filteredEvents.length,
      },
      filters: {
        agents: Array.from(agents).sort(),
        messageProviders: Array.from(messageProviders).sort(),
        llmProviders: Array.from(llmProviders).sort(),
      },
      timeline,
      agentMetrics,
    };
  }

  private redactString(val: string | undefined): string | undefined {
    if (!val || val.length <= 4) return val;
    return '*'.repeat(val.length - 4) + val.slice(-4);
  }

  private annotateEvent(
    event: MessageFlowEvent,
    botMap: Map<string, { llmProvider: string }>
  ): AnnotatedEvent {
    const bot = botMap.get(event.botName);
    return {
      ...event,
      userId: this.redactString(event.userId) ?? '',
      channelId: this.redactString(event.channelId) ?? '',
      llmProvider: bot?.llmProvider || 'unknown',
    };
  }

  private buildTimelineAndMetrics(
    events: AnnotatedEvent[],
    botStats: Record<string, { messageCount: number; errors: string[]; errorCount: number }>
  ) {
    const bucketMs = 60 * 1000;
    const buckets = new Map<
      string,
      {
        messageProviders: Record<string, number>;
        llmProviders: Record<string, number>;
        timestampMs: number;
      }
    >();

    const metrics = new Map<
      string,
      {
        botName: string;
        messageProvider: string;
        llmProvider: string;
        events: number;
        errors: number;
        lastActivity: string;
        lastActivityMs: number;
        totalMessages: number;
        recentErrors: string[];
      }
    >();

    events.forEach((event) => {
      const timestampMs = new Date(event.timestamp).getTime();
      if (Number.isNaN(timestampMs)) {
        return;
      }

      const bucketStart = Math.floor(timestampMs / bucketMs) * bucketMs;
      const bucketKey = new Date(bucketStart).toISOString();

      let bucket = buckets.get(bucketKey);
      if (!bucket) {
        bucket = { messageProviders: {}, llmProviders: {}, timestampMs: bucketStart };
        buckets.set(bucketKey, bucket);
      }
      bucket.messageProviders[event.provider] = (bucket.messageProviders[event.provider] || 0) + 1;
      bucket.llmProviders[event.llmProvider] = (bucket.llmProviders[event.llmProvider] || 0) + 1;

      const existing = metrics.get(event.botName);
      const isError = event.status === 'error' || event.status === 'timeout';

      if (!existing) {
        metrics.set(event.botName, {
          botName: event.botName,
          messageProvider: event.provider,
          llmProvider: event.llmProvider,
          events: 1,
          errors: isError ? 1 : 0,
          lastActivity: event.timestamp,
          lastActivityMs: timestampMs,
          totalMessages: botStats[event.botName]?.messageCount ?? 0,
          recentErrors: botStats[event.botName]?.errors ?? [],
        });
      } else {
        existing.events += 1;
        if (isError) {
          existing.errors += 1;
        }
        if (timestampMs > existing.lastActivityMs) {
          existing.lastActivity = event.timestamp;
          existing.lastActivityMs = timestampMs;
        }
        existing.totalMessages = botStats[event.botName]?.messageCount ?? 0;
        existing.recentErrors = botStats[event.botName]?.errors ?? [];
      }
    });

    const timeline = Array.from(buckets.entries())
      .sort((a, b) => a[1].timestampMs - b[1].timestampMs)
      .map(([timestamp, data]) => ({
        timestamp,
        messageProviders: data.messageProviders,
        llmProviders: data.llmProviders,
      }));

    const agentMetrics = Array.from(metrics.values())
      .map((m) => {
        const { lastActivityMs: _lastActivityMs, ...rest } = m;
        return rest;
      })
      .sort((a, b) => b.events - a.events);

    return { timeline, agentMetrics };
  }
}
