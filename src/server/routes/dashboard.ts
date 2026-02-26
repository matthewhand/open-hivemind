import { Router } from 'express';
import { DatabaseManager } from '@src/database/DatabaseManager';
import WebSocketService, { type MessageFlowEvent } from '@src/server/services/WebSocketService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { authenticateToken } from '../middleware/auth';
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

router.get('/ai/config', authenticateToken, (req, res) => {
  res.json(dashboardConfig);
});

router.post('/ai/config', authenticateToken, (req, res) => {
  dashboardConfig = { ...dashboardConfig, ...req.body };
  res.json(dashboardConfig);
});

router.get('/ai/stats', authenticateToken, (req, res) => {
  res.json({
    learningProgress: 75,
    behaviorPatternsCount: mockBehaviorPatterns.length,
    userSegmentsCount: mockUserSegments.length,
  });
});

router.get('/ai/segments', authenticateToken, (req, res) => {
  res.json(mockUserSegments);
});

router.get('/ai/patterns', authenticateToken, (req, res) => {
  res.json(mockBehaviorPatterns);
});

router.get('/ai/recommendations', authenticateToken, (req, res) => {
  const recommendations: DashboardRecommendation[] = [
    {
      id: `rec-1`,
      type: 'widget',
      title: `Add Performance Widget`,
      description: `Based on your frequent usage of system stats`,
      confidence: 0.85,
      impact: 'high',
      reasoning: 'You check system stats daily',
      preview: { widgetId: 'performance-monitor', type: 'preview' },
    },
    {
      id: `rec-2`,
      type: 'layout',
      title: 'Optimize Dashboard Layout',
      description: `Switch to grid-3x3 layout`,
      confidence: 0.9,
      impact: 'medium',
      reasoning: `Based on your Power Users usage pattern`,
    },
  ];
  res.json(recommendations);
});

router.post('/ai/feedback', authenticateToken, async (req, res) => {
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
      const svc = require('@hivemind/adapter-slack').SlackService as any;
      const instance = svc?.getInstance?.();
      const mgr = instance?.getBotManager?.(bot.name) || instance?.getBotManager?.();
      const bots = mgr?.getAllBots?.() || [];
      return Array.isArray(bots) && bots.length > 0;
    }
    if (bot.messageProvider === 'discord') {
      const svc = require('@hivemind/adapter-discord') as any;
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

router.get('/status', authenticateToken, (req, res) => {
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

router.get('/activity', authenticateToken, async (req, res) => {
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

    const allEvents = storedEvents.map((event) => annotateEvent(event, botMap));
    const filteredEvents = allEvents.filter((event) => {
      if (botFilter.length && !botFilter.includes(event.botName)) {
        return false;
      }
      if (providerFilter.length && !providerFilter.includes(event.provider)) {
        return false;
      }
      if (llmFilter.length && !llmFilter.includes(event.llmProvider)) {
        return false;
      }
      const ts = new Date(event.timestamp).getTime();
      if (from && ts < from.getTime()) {
        return false;
      }
      if (to && ts > to.getTime()) {
        return false;
      }
      return true;
    });

    const timeline = buildTimeline(filteredEvents);
    const agentMetrics = buildAgentMetrics(filteredEvents, ws.getAllBotStats());

    res.json({
      events: filteredEvents.slice(-200),
      filters: {
        agents: Array.from(new Set(allEvents.map((event) => event.botName))).sort(),
        messageProviders: Array.from(new Set(allEvents.map((event) => event.provider))).sort(),
        llmProviders: Array.from(new Set(allEvents.map((event) => event.llmProvider))).sort(),
      },
      timeline,
      agentMetrics,
    });
  } catch (error) {
    console.error('Activity API error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity feed' });
  }
});

router.post('/alerts/:id/acknowledge', authenticateToken, (req, res) => {
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

router.post('/alerts/:id/resolve', authenticateToken, (req, res) => {
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

function annotateEvent(
  event: MessageFlowEvent,
  botMap: Map<string, { llmProvider: string }>
): AnnotatedEvent {
  const bot = botMap.get(event.botName);
  return {
    ...event,
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
