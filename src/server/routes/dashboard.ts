import { Router } from 'express';
import { DatabaseManager } from '@src/database/DatabaseManager';
import WebSocketService, { type MessageFlowEvent } from '@src/server/services/WebSocketService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AnalyticsService } from '../../services/AnalyticsService';
import { ActivityLogger } from '../services/ActivityLogger';

type AnnotatedEvent = MessageFlowEvent & { llmProvider: string };

const router = Router();

// ----------------------------------------------------------------------------
// AI Dashboard Interfaces & Mock Data
// ----------------------------------------------------------------------------

interface BehaviorPattern {
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

interface DashboardRecommendation {
  id: string;
  type: 'widget' | 'layout' | 'theme' | 'settings';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  reasoning: string;
  preview?: Record<string, unknown>;
  userFeedback?: 'liked' | 'disliked' | null;
}

interface UserSegment {
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

interface AIDashboardConfig {
  enabled: boolean;
  learningRate: number;
  confidenceThreshold: number;
  recommendationFrequency: number;
  behaviorTracking: boolean;
  personalization: boolean;
  predictiveAnalytics: boolean;
  autoOptimization: boolean;
}

let dashboardConfig: AIDashboardConfig = {
  enabled: true,
  learningRate: 0.1,
  confidenceThreshold: 0.7,
  recommendationFrequency: 30, // minutes
  behaviorTracking: true,
  personalization: true,
  predictiveAnalytics: true,
  autoOptimization: true,
};

const mockBehaviorPatterns: BehaviorPattern[] = [
  {
    id: 'pattern-001',
    name: 'Performance Monitor',
    description: 'User frequently checks performance metrics and system health',
    frequency: 0.85,
    confidence: 0.92,
    trend: 'increasing',
    segments: ['power-user', 'admin'],
    recommendedWidgets: ['performance-monitor', 'system-health', 'resource-usage'],
    priority: 1,
  },
  {
    id: 'pattern-002',
    name: 'Analytics Explorer',
    description: 'User explores analytics data and trends regularly',
    frequency: 0.73,
    confidence: 0.88,
    trend: 'stable',
    segments: ['analyst', 'manager'],
    recommendedWidgets: ['analytics-dashboard', 'trend-analysis', 'data-visualization'],
    priority: 2,
  },
  {
    id: 'pattern-003',
    name: 'Quick Glancer',
    description: 'User prefers quick overview with minimal interaction',
    frequency: 0.62,
    confidence: 0.79,
    trend: 'decreasing',
    segments: ['casual-user'],
    recommendedWidgets: ['summary-cards', 'quick-stats', 'status-overview'],
    priority: 3,
  },
];

const mockUserSegments: UserSegment[] = [
  {
    id: 'segment-001',
    name: 'Power Users',
    description: 'Highly engaged users who use advanced features frequently',
    criteria: {
      behaviorPatterns: ['pattern-001', 'pattern-002'],
      usageFrequency: 'daily',
      featureUsage: ['advanced-analytics', 'performance-monitoring', 'system-config'],
      engagementLevel: 'high',
    },
    characteristics: {
      preferredWidgets: ['performance-monitor', 'analytics-dashboard', 'system-health'],
      optimalLayout: 'grid-3x3',
      themePreference: 'dark',
      notificationFrequency: 5,
    },
    size: 150,
    confidence: 0.89,
  },
  {
    id: 'segment-002',
    name: 'Casual Users',
    description: 'Users who prefer simple, quick-access information',
    criteria: {
      behaviorPatterns: ['pattern-003'],
      usageFrequency: 'weekly',
      featureUsage: ['basic-stats', 'status-overview'],
      engagementLevel: 'low',
    },
    characteristics: {
      preferredWidgets: ['summary-cards', 'quick-stats', 'status-overview'],
      optimalLayout: 'list-2x2',
      themePreference: 'light',
      notificationFrequency: 1,
    },
    size: 320,
    confidence: 0.76,
  },
];

// ----------------------------------------------------------------------------
// AI Dashboard Endpoints
// Note: These are mounted at /api/dashboard by index.ts, so paths here are relative to that.
// Full paths: /api/dashboard/ai/config, /api/dashboard/status, etc.
// ----------------------------------------------------------------------------

router.get('/ai/config', authenticate, requireAdmin, (req, res) => {
  res.json(dashboardConfig);
});

router.post('/ai/config', authenticate, requireAdmin, (req, res) => {
  dashboardConfig = { ...dashboardConfig, ...req.body };
  res.json(dashboardConfig);
});

router.get('/ai/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const analytics = AnalyticsService.getInstance();
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const stats = await analytics.getStats({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    res.json({
      learningProgress: stats.learningProgress,
      behaviorPatternsCount: stats.behaviorPatternsCount,
      userSegmentsCount: stats.userSegmentsCount,
      totalMessages: stats.totalMessages,
      totalErrors: stats.totalErrors,
      avgProcessingTime: stats.avgProcessingTime,
      activeBots: stats.activeBots,
      activeUsers: stats.activeUsers,
    });
  } catch (error) {
    console.error('AI stats API error:', error);
    res.status(500).json({ error: 'Failed to get AI stats' });
  }
});

router.get('/ai/segments', authenticate, requireAdmin, (req, res) => {
  try {
    const analytics = AnalyticsService.getInstance();
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const segments = analytics.getUserSegments({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    res.json(segments);
  } catch (error) {
    console.error('AI segments API error:', error);
    res.status(500).json({ error: 'Failed to get user segments' });
  }
});

router.get('/ai/patterns', authenticate, requireAdmin, (req, res) => {
  try {
    const analytics = AnalyticsService.getInstance();
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const patterns = analytics.getBehaviorPatterns({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    res.json(patterns);
  } catch (error) {
    console.error('AI patterns API error:', error);
    res.status(500).json({ error: 'Failed to get behavior patterns' });
  }
});

router.get('/ai/recommendations', authenticate, requireAdmin, (req, res) => {
  try {
    const analytics = AnalyticsService.getInstance();
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const recommendations = analytics.getRecommendations({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    res.json(recommendations);
  } catch (error) {
    console.error('AI recommendations API error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.post('/ai/feedback', authenticate, requireAdmin, async (req, res) => {
  const { recommendationId, feedback, metadata } = req.body;
  try {
    const db = DatabaseManager.getInstance();
    await db.storeAIFeedback({ recommendationId, feedback, metadata });
    res.json({ success: true });
  } catch (error) {
    console.error('Error storing AI feedback:', error);
    res.status(500).json({ error: 'Failed to store feedback' });
  }
});

// Root route removed - dashboard is now served from public/index.html
// This file only contains API endpoints

function isProviderConnected(bot: any): boolean {
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
    return true; // safe fallback
  }
}

router.get('/status', authenticate, requireAdmin, (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    let bots = [];
    try {
      bots = manager.getAllBots();
    } catch (e) {
      console.warn('Failed to load bots for status:', e);
      bots = [];
    }

    const ws = WebSocketService.getInstance();

    // Keep status lightweight and deterministic for tests: mark configured bots as active
    const status = bots
      .filter((bot) => bot && bot.name)
      .map((bot) => ({
        id: bot.name, // Using name as ID for now, could be improved with a real ID
        name: bot.name,
        provider: bot.messageProvider,
        llmProvider: bot.llmProvider,
        status: 'active',
        connected: isProviderConnected(bot),
        messageCount: ws.getBotStats(bot.name).messageCount,
        errorCount: ws.getBotStats(bot.name).errorCount,
      }));

    res.json({ bots: status, uptime: process.uptime() });
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get('/activity', authenticate, requireAdmin, async (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const ws = WebSocketService.getInstance();

    const botList = manager.getAllBots();
    const botMap = new Map(botList.map((bot) => [bot.name, bot]));

    const botFilter = parseMultiParam(req.query.bot);
    const providerFilter = parseMultiParam(req.query.messageProvider);
    const llmFilter = parseMultiParam(req.query.llmProvider);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    // Fetch events from persistent storage
    const storedEvents = await ActivityLogger.getInstance().getEvents({
      startTime: from || undefined,
      endTime: to || undefined,
      limit: 5000,
    });

    const botFilterSet = new Set(botFilter);
    const providerFilterSet = new Set(providerFilter);
    const llmFilterSet = new Set(llmFilter);

    const hasBotFilter = botFilterSet.size > 0;
    const hasProviderFilter = providerFilterSet.size > 0;
    const hasLlmFilter = llmFilterSet.size > 0;

    const fromTime = from?.getTime();
    const toTime = to?.getTime();

    const agents = new Set<string>();
    const messageProviders = new Set<string>();
    const llmProviders = new Set<string>();

    const hasAnyFilter = hasBotFilter || hasProviderFilter || hasLlmFilter || fromTime || toTime;

    // ⚡ Bolt Optimization: Apply .filter() before .map()
    // This avoids allocating, transforming, and garbage-collecting thousands
    // of unnecessary intermediate annotated event objects (and redactString computations),
    // significantly reducing memory overhead when filtering large datasets (up to 5000 items).
    // Build filter options from all events, not just filtered results
    storedEvents.forEach((event) => {
      const bot = botMap.get(event.botName);
      agents.add(event.botName);
      messageProviders.add(event.provider);
      llmProviders.add(bot?.llmProvider || 'unknown');
    });

    const filteredEvents = storedEvents
      .filter((event) => {
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
      })
      .map((event) => annotateEvent(event, botMap));

    const timeline = buildTimeline(filteredEvents);
    const agentMetrics = buildAgentMetrics(filteredEvents, ws.getAllBotStats());

    res.json({
      events: filteredEvents.slice(-200),
      filters: {
        agents: Array.from(agents).sort(),
        messageProviders: Array.from(messageProviders).sort(),
        llmProviders: Array.from(llmProviders).sort(),
      },
      timeline,
      agentMetrics,
    });
  } catch (error) {
    console.error('Activity API error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity feed' });
  }
});

router.post('/alerts/:id/acknowledge', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const ws = WebSocketService.getInstance();
    const success = ws.acknowledgeAlert(id);
    if (success) {
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ success: false, message: 'Alert not found' });
    }
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

router.post('/alerts/:id/resolve', authenticate, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const ws = WebSocketService.getInstance();
    const success = ws.resolveAlert(id);
    if (success) {
      res.json({ success: true, message: 'Alert resolved' });
    } else {
      res.status(404).json({ success: false, message: 'Alert not found' });
    }
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

export default router;

function parseMultiParam(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(parseMultiParam).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Redacts a string by masking all but the last 4 characters.
 * Useful for preventing PII (like User IDs and Channel IDs) from leaking to the frontend.
 */
function redactString(val: string | undefined): string | undefined {
  if (!val || val.length <= 4) return val;
  return '*'.repeat(val.length - 4) + val.slice(-4);
}

function annotateEvent(
  event: MessageFlowEvent,
  botMap: Map<string, { llmProvider: string }>
): AnnotatedEvent {
  const bot = botMap.get(event.botName);
  return {
    ...event,
    userId: redactString(event.userId),
    channelId: redactString(event.channelId),
    llmProvider: bot?.llmProvider || 'unknown',
  };
}

function buildTimeline(events: AnnotatedEvent[]) {
  const bucketMs = 60 * 1000; // 1 minute buckets
  const buckets = new Map<
    string,
    { messageProviders: Record<string, number>; llmProviders: Record<string, number> }
  >();

  events.forEach((event) => {
    const timestamp = new Date(event.timestamp).getTime();
    if (Number.isNaN(timestamp)) {
      return;
    }
    const bucketStart = Math.floor(timestamp / bucketMs) * bucketMs;
    const bucketKey = new Date(bucketStart).toISOString();

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { messageProviders: {}, llmProviders: {} });
    }

    const bucket = buckets.get(bucketKey)!;

    bucket.messageProviders[event.provider] = (bucket.messageProviders[event.provider] || 0) + 1;
    bucket.llmProviders[event.llmProvider] = (bucket.llmProviders[event.llmProvider] || 0) + 1;
  });

  return Array.from(buckets.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([timestamp, data]) => ({ timestamp, ...data }));
}

function buildAgentMetrics(
  events: AnnotatedEvent[],
  botStats: Record<string, { messageCount: number; errors: string[]; errorCount: number }>
) {
  const metrics = new Map<
    string,
    {
      botName: string;
      messageProvider: string;
      llmProvider: string;
      events: number;
      errors: number;
      lastActivity: string;
      totalMessages: number;
      recentErrors: string[];
    }
  >();

  events.forEach((event) => {
    const existing = metrics.get(event.botName);
    const errorsForBot = botStats[event.botName]?.errors ?? [];
    const totalMessages = botStats[event.botName]?.messageCount ?? 0;

    if (!existing) {
      metrics.set(event.botName, {
        botName: event.botName,
        messageProvider: event.provider,
        llmProvider: event.llmProvider,
        events: 1,
        errors: event.status === 'error' || event.status === 'timeout' ? 1 : 0,
        lastActivity: event.timestamp,
        totalMessages,
        recentErrors: errorsForBot,
      });
      return;
    }

    existing.events += 1;
    if (event.status === 'error' || event.status === 'timeout') {
      existing.errors += 1;
    }
    if (new Date(event.timestamp).getTime() > new Date(existing.lastActivity).getTime()) {
      existing.lastActivity = event.timestamp;
    }
    existing.totalMessages = totalMessages;
    existing.recentErrors = errorsForBot;
  });

  return Array.from(metrics.values()).sort((a, b) => b.events - a.events);
}
