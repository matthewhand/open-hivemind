import Debug from 'debug';
import { Router } from 'express';
import { DatabaseManager } from '@src/database/DatabaseManager';
import WebSocketService, { type MessageFlowEvent } from '@src/server/services/WebSocketService';
import { BotConfigurationManager } from '@config/BotConfigurationManager';
import { authenticate, requireAdmin } from '../../auth/middleware';
import { AnalyticsService } from '../../services/AnalyticsService';
import {
  AlertIdParamSchema,
  ExportActivitySchema,
  ExportAnalyticsSchema,
  }
);

router.get('/analytics/export', authenticate, requireAdmin, validateRequest(ExportAnalyticsSchema), async (req, res) => {
  try {
    const format = (req.query.format as string) || 'csv';
    const analytics = AnalyticsService.getInstance();
    const ws = WebSocketService.getInstance();
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);

    // Fetch analytics data
    const stats = await analytics.getStats({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    const patterns = await analytics.getBehaviorPatterns({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    const segments = await analytics.getUserSegments({
      startTime: from || undefined,
      endTime: to || undefined,
    });

    // Fetch activity data for bot performance
    const storedEvents = await ActivityLogger.getInstance().getEvents({
      startTime: from || undefined,
      endTime: to || undefined,
      limit: 5000,
    });

    const manager = BotConfigurationManager.getInstance();
    const botList = manager.getAllBots();
    const botMap = new Map(botList.map((bot) => [bot.name, bot]));

    const annotatedEvents = storedEvents.map((event) => annotateEvent(event, botMap));
    const agentMetrics = buildAgentMetrics(annotatedEvents, ws.getAllBotStats());

    // Get current performance metrics
    const performanceMetrics = {
      timestamp: new Date().toISOString(),
      cpuUsage: 0, // Would need actual system metrics
      memoryUsage: 0, // Would need actual system metrics
      activeConnections: ws.getConnectedClients().length,
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_export_${new Date().toISOString()}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        filters: {
          from: from?.toISOString(),
          to: to?.toISOString(),
        },
        summary: {
          totalMessages: stats.totalMessages,
          totalErrors: stats.totalErrors,
          avgProcessingTime: stats.avgProcessingTime,
          activeBots: stats.activeBots,
          activeUsers: stats.activeUsers,
          errorRate: stats.totalMessages > 0 ? (stats.totalErrors / stats.totalMessages * 100).toFixed(2) + '%' : '0%',
          successRate: stats.totalMessages > 0 ? ((stats.totalMessages - stats.totalErrors) / stats.totalMessages * 100).toFixed(2) + '%' : '100%',
          availability: stats.totalMessages > 0 ? ((stats.totalMessages - stats.totalErrors) / stats.totalMessages * 100).toFixed(2) + '%' : '100%',
        },
        botPerformance: agentMetrics.map((metric) => ({
          botName: metric.botName,
          messageProvider: metric.messageProvider,
          llmProvider: metric.llmProvider,
          totalMessages: metric.totalMessages,
          events: metric.events,
          errors: metric.errors,
          errorRate: metric.events > 0 ? ((metric.errors / metric.events) * 100).toFixed(2) + '%' : '0%',
          successRate: metric.events > 0 ? (((metric.events - metric.errors) / metric.events) * 100).toFixed(2) + '%' : '100%',
          lastActivity: metric.lastActivity,
          avgResponseTime: metric.avgResponseTime,
          minResponseTime: metric.minResponseTime,
          maxResponseTime: metric.maxResponseTime,
          p95ResponseTime: metric.p95ResponseTime,
          p99ResponseTime: metric.p99ResponseTime,
        })),
        behaviorPatterns: patterns,
        userSegments: segments,
        performance: performanceMetrics,
      });
    } else {
      // CSV format - Bot Performance Summary
      const escapeCsv = (value: string | number | null | undefined): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        const escaped = stringValue.replace(/"/g, '""').replace(/\n/g, ' ');
        return `"${escaped}"`;
      };

      // Summary section
      let csvContent = '# Analytics Export Summary\n';
      csvContent += escapeCsv('Metric') + ',' + escapeCsv('Value') + '\n';
      csvContent += escapeCsv('Export Date') + ',' + escapeCsv(new Date().toISOString()) + '\n';
      csvContent += escapeCsv('Date Range From') + ',' + escapeCsv(from?.toISOString() || 'Beginning') + '\n';
      csvContent += escapeCsv('Date Range To') + ',' + escapeCsv(to?.toISOString() || 'Now') + '\n';
      csvContent += escapeCsv('Total Messages') + ',' + escapeCsv(stats.totalMessages) + '\n';
      csvContent += escapeCsv('Total Errors') + ',' + escapeCsv(stats.totalErrors) + '\n';
      csvContent += escapeCsv('Error Rate') + ',' + escapeCsv(stats.totalMessages > 0 ? ((stats.totalErrors / stats.totalMessages) * 100).toFixed(2) + '%' : '0%') + '\n';
      csvContent += escapeCsv('Avg Processing Time (ms)') + ',' + escapeCsv(stats.avgProcessingTime) + '\n';
      csvContent += escapeCsv('Active Bots') + ',' + escapeCsv(stats.activeBots) + '\n';
      csvContent += escapeCsv('Active Users') + ',' + escapeCsv(stats.activeUsers) + '\n';
      csvContent += escapeCsv('Active Connections') + ',' + escapeCsv(performanceMetrics.activeConnections) + '\n';
      csvContent += '\n';

      // Bot Performance section
      csvContent += '# Bot Performance Details\n';
      const botHeaders = [
        'Bot Name',
        'Message Provider',
        'LLM Provider',
        'Total Messages',
        'Events',
        'Errors',
        'Error Rate',
        'Success Rate',
        'Last Activity',
        'Avg Response Time (ms)',
        'Min Response Time (ms)',
        'Max Response Time (ms)',
        'P95 Response Time (ms)',
        'P99 Response Time (ms)',
      ];
      csvContent += botHeaders.map(escapeCsv).join(',') + '\n';

      agentMetrics.forEach((metric) => {
        const row = [
          metric.botName,
          metric.messageProvider,
          metric.llmProvider,
          metric.totalMessages,
          metric.events,
          metric.errors,
          metric.events > 0 ? ((metric.errors / metric.events) * 100).toFixed(2) + '%' : '0%',
          metric.events > 0 ? (((metric.events - metric.errors) / metric.events) * 100).toFixed(2) + '%' : '100%',
          new Date(metric.lastActivity).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          }),
          metric.avgResponseTime || 'N/A',
          metric.minResponseTime || 'N/A',
          metric.maxResponseTime || 'N/A',
          metric.p95ResponseTime || 'N/A',
          metric.p99ResponseTime || 'N/A',
        ];
        csvContent += row.map(escapeCsv).join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
      res.setHeader('Content-Disposition', `attachment; filename="analytics_export_${new Date().toISOString()}.csv"`);
      res.send(csvContent);
    }
  } catch (error) {
    debug('ERROR:', 'Analytics export error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
);

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
      avgResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      responseTimes: number[];
    }
  >();

  events.forEach((event) => {
    const existing = metrics.get(event.botName);
    const errorsForBot = botStats[event.botName]?.errors ?? [];
    const totalMessages = botStats[event.botName]?.messageCount ?? 0;

    if (!existing) {
      const responseTimes = event.processingTime != null ? [event.processingTime] : [];
      metrics.set(event.botName, {
        botName: event.botName,
        messageProvider: event.provider,
        llmProvider: event.llmProvider,
        events: 1,
        errors: event.status === 'error' || event.status === 'timeout' ? 1 : 0,
        lastActivity: event.timestamp,
        totalMessages,
        recentErrors: errorsForBot,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        responseTimes,
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

    // Collect response times for calculation
    if (event.processingTime != null) {
      existing.responseTimes.push(event.processingTime);
    }
  });

  // Calculate response time metrics for each bot
  const results = Array.from(metrics.values()).map((metric) => {
    const times = metric.responseTimes;

    if (times.length === 0) {
      // No response time data available
      const { responseTimes, ...rest } = metric;
      return rest;
    }

    // Sort for percentile calculations
    const sortedTimes = [...times].sort((a, b) => a - b);

    // Calculate metrics
    const sum = times.reduce((acc, t) => acc + t, 0);
    const avgResponseTime = Math.round(sum / times.length);
    const minResponseTime = sortedTimes[0];
    const maxResponseTime = sortedTimes[sortedTimes.length - 1];

    // Calculate percentiles
    const p95Index = Math.ceil(sortedTimes.length * 0.95) - 1;
    const p99Index = Math.ceil(sortedTimes.length * 0.99) - 1;
    const p95ResponseTime = sortedTimes[Math.max(0, p95Index)];
    const p99ResponseTime = sortedTimes[Math.max(0, p99Index)];

    const { responseTimes, ...rest } = metric;
    return {
      ...rest,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
    };
  });

  return results.sort((a, b) => b.events - a.events);
}
