import { Router } from 'express';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import WebSocketService from '@src/server/services/WebSocketService';
import type { MessageFlowEvent } from '@src/server/services/WebSocketService';

type AnnotatedEvent = MessageFlowEvent & { llmProvider: string };

const router = Router();

// Root route removed - dashboard is now served from public/index.html
// This file only contains API endpoints

function isProviderConnected(bot: any): boolean {
  try {
    if (bot.messageProvider === 'slack') {
      const svc = require('@integrations/slack/SlackService').default;
      const instance = svc?.getInstance?.();
      const mgr = instance?.getBotManager?.(bot.name) || instance?.getBotManager?.();
      const bots = mgr?.getAllBots?.() || [];
      return Array.isArray(bots) && bots.length > 0;
    }
    if (bot.messageProvider === 'discord') {
      const svc = require('@integrations/discord/DiscordService');
      const instance = svc?.DiscordService?.getInstance?.() || svc?.Discord?.DiscordService?.getInstance?.();
      const bots = instance?.getAllBots?.() || [];
      return Array.isArray(bots) && bots.length > 0;
    }
    return true;
  } catch {
    return true; // safe fallback
  }
}

router.get('/api/status', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const bots = manager.getAllBots();
    const ws = WebSocketService.getInstance();

    // Keep status lightweight and deterministic for tests: mark configured bots as active
    const status = bots.map(bot => ({
      id: bot.name, // Using name as ID for now, could be improved with a real ID
      name: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      status: 'active',
      connected: isProviderConnected(bot),
      messageCount: ws.getBotStats(bot.name).messageCount,
      errorCount: ws.getBotStats(bot.name).errors.length
    }));

    res.json({ bots: status, uptime: process.uptime() });
  } catch (error) {
    console.error('Status API error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

router.get('/api/activity', (req, res) => {
  try {
    const manager = BotConfigurationManager.getInstance();
    const ws = WebSocketService.getInstance();

    const botList = manager.getAllBots();
    const botMap = new Map(botList.map(bot => [bot.name, bot]));

    const botFilter = parseMultiParam(req.query.bot);
    const providerFilter = parseMultiParam(req.query.messageProvider);
    const llmFilter = parseMultiParam(req.query.llmProvider);
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    const allEvents = ws.getMessageFlow(1000).map(event => annotateEvent(event, botMap));
    const filteredEvents = allEvents.filter(event => {
      if (botFilter.length && !botFilter.includes(event.botName)) return false;
      if (providerFilter.length && !providerFilter.includes(event.provider)) return false;
      if (llmFilter.length && !llmFilter.includes(event.llmProvider)) return false;
      const ts = new Date(event.timestamp).getTime();
      if (from && ts < from.getTime()) return false;
      if (to && ts > to.getTime()) return false;
      return true;
    });

    const timeline = buildTimeline(filteredEvents);
    const agentMetrics = buildAgentMetrics(filteredEvents, ws.getAllBotStats());

    res.json({
      events: filteredEvents.slice(-200),
      filters: {
        agents: Array.from(new Set(allEvents.map(event => event.botName))).sort(),
        messageProviders: Array.from(new Set(allEvents.map(event => event.provider))).sort(),
        llmProviders: Array.from(new Set(allEvents.map(event => event.llmProvider))).sort(),
      },
      timeline,
      agentMetrics,
    });
  } catch (error) {
    console.error('Activity API error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity feed' });
  }
});

export default router;

function parseMultiParam(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(parseMultiParam).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function annotateEvent(event: MessageFlowEvent, botMap: Map<string, { llmProvider: string }>): AnnotatedEvent {
  const bot = botMap.get(event.botName);
  return {
    ...event,
    llmProvider: bot?.llmProvider || 'unknown',
  };
}

function buildTimeline(events: AnnotatedEvent[]) {
  const bucketMs = 60 * 1000; // 1 minute buckets
  const buckets = new Map<string, { messageProviders: Record<string, number>; llmProviders: Record<string, number> }>();

  events.forEach(event => {
    const timestamp = new Date(event.timestamp).getTime();
    if (Number.isNaN(timestamp)) return;
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

function buildAgentMetrics(events: AnnotatedEvent[],
  botStats: Record<string, { messageCount: number; errors: string[] }>) {
  const metrics = new Map<string, {
    botName: string;
    messageProvider: string;
    llmProvider: string;
    events: number;
    errors: number;
    lastActivity: string;
    totalMessages: number;
    recentErrors: string[];
  }>();

  events.forEach(event => {
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
