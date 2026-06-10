import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { DatabaseManager } from '../../database/DatabaseManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import { ActivityFilterSchema, LogActivitySchema } from '../../validation/schemas/activitySchema';
import { validateRequest } from '../../validation/validateRequest';
import { ActivityLogger } from '../services/ActivityLogger';

const debug = Debug('app:webui:activity');
const router = Router();

/** Keep only the last 4 characters visible (matches DashboardService redaction). */
function redactString(val: string | undefined): string {
  if (!val) return '';
  if (val.length <= 4) return val;
  return '*'.repeat(val.length - 4) + val.slice(-4);
}

interface MessageActivity {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  messageProvider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  userDisplayName: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  mcpToolsUsed?: string[];
}

interface LLMUsageMetric {
  timestamp: string;
  agentId: string;
  llmProvider: string;
  model?: string;
  tokensUsed: number;
  responseTime: number;
  cost?: number;
}

interface ActivitySummary {
  totalMessages: number;
  totalAgents: number;
  averageResponseTime: number;
  errorRate: number;
  messagesByProvider: Record<string, number>;
  messagesByAgent: Record<string, number>;
  llmUsageByProvider: Record<string, number>;
  timeRangeStart: string;
  timeRangeEnd: string;
}

// GET /api/activity/messages - Get filtered message activity from recorded
// message-flow events (ActivityLogger JSONL store).
router.get(
  '/messages',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const filter = { ...req.query } as any;
    filter.limit = filter.limit ? parseInt(filter.limit as string, 10) : 100;
    filter.offset = filter.offset ? parseInt(filter.offset as string, 10) : 0;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    const logger = ActivityLogger.getInstance();
    const loggerFilter = {
      startTime: filter.startDate ? new Date(filter.startDate) : undefined,
      endTime: filter.endDate ? new Date(filter.endDate) : undefined,
      botName: filter.agentId || undefined,
      provider: filter.messageProvider || undefined,
      llmProvider: filter.llmProvider || undefined,
    };

    const [events, total] = await Promise.all([
      logger.getEvents({ ...loggerFilter, limit: filter.limit, offset: filter.offset }),
      logger.getEventsCount(loggerFilter),
    ]);

    const messages: MessageActivity[] = events.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      agentId: event.botName,
      agentName: event.botName,
      messageProvider: event.provider,
      llmProvider: event.llmProvider || 'unknown',
      channelId: redactString(event.channelId),
      userId: redactString(event.userId),
      userDisplayName: redactString(event.userId),
      messageType: event.messageType,
      contentLength: event.contentLength,
      processingTime: event.processingTime,
      status: event.status,
      errorMessage: event.errorMessage,
    }));

    return res.json(
      ApiResponse.success({
        messages,
        total,
        filter,
        meta: {
          source: 'activity-log',
          ...(messages.length === 0
            ? { note: 'No message activity recorded yet for the requested filter.' }
            : {}),
        },
      })
    );
  })
);

// GET /api/activity/llm-usage - Get LLM usage metrics from persisted
// inference logs (inference_logs table, written by the pipeline InferenceStage).
router.get(
  '/llm-usage',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const filter = { ...req.query } as any;
    filter.limit = filter.limit ? parseInt(filter.limit as string, 10) : 100;
    filter.offset = filter.offset ? parseInt(filter.offset as string, 10) : 0;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    const logs = await dbManager.getInferenceLogs({
      botName: filter.agentId || undefined,
      provider: filter.llmProvider || undefined,
      startTime: filter.startDate ? new Date(filter.startDate) : undefined,
      endTime: filter.endDate ? new Date(filter.endDate) : undefined,
      limit: filter.limit,
      offset: filter.offset,
    });

    const usage: LLMUsageMetric[] = logs.map((log) => ({
      timestamp: log.timestamp,
      agentId: log.botName,
      llmProvider: log.provider || 'unknown',
      tokensUsed: log.tokensUsed ?? 0,
      responseTime: log.latencyMs ?? 0,
    }));

    return res.json(
      ApiResponse.success({
        usage,
        filter,
        meta: {
          source: 'inference-logs',
          ...(usage.length === 0
            ? {
                note: 'No inference logs recorded for the requested filter. LLM usage is persisted only while DATABASE_PERSIST_INFERENCE is enabled (default on).',
              }
            : {}),
        },
      })
    );
  })
);

// GET /api/activity/summary - Get activity summary
router.get(
  '/summary',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as any;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    const stats = await dbManager.getStats();

    const timeRangeStart = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const timeRangeEnd = endDate || new Date().toISOString();

    // Derive response-time, error-rate, per-agent and per-LLM-provider metrics
    // from the recorded activity events for the requested time range.
    const events = await ActivityLogger.getInstance().getEvents({
      startTime: new Date(timeRangeStart),
      endTime: new Date(timeRangeEnd),
      limit: Number.MAX_SAFE_INTEGER,
    });

    const messagesByAgent: Record<string, number> = {};
    const llmUsageByProvider: Record<string, number> = {};
    let processingTimeTotal = 0;
    let processingTimeSamples = 0;
    let errorCount = 0;

    for (const event of events) {
      if (event.botName) {
        messagesByAgent[event.botName] = (messagesByAgent[event.botName] || 0) + 1;
      }
      if (event.llmProvider) {
        llmUsageByProvider[event.llmProvider] = (llmUsageByProvider[event.llmProvider] || 0) + 1;
      }
      if (typeof event.processingTime === 'number') {
        processingTimeTotal += event.processingTime;
        processingTimeSamples += 1;
      }
      if (event.status === 'error' || event.status === 'timeout') {
        errorCount += 1;
      }
    }

    const averageResponseTime =
      processingTimeSamples > 0 ? Math.round(processingTimeTotal / processingTimeSamples) : 0;
    const errorRate = events.length > 0 ? errorCount / events.length : 0;

    const summary: ActivitySummary = {
      totalMessages: stats.totalMessages,
      totalAgents: stats.totalChannels,
      averageResponseTime,
      errorRate,
      messagesByProvider: stats.providers,
      messagesByAgent,
      llmUsageByProvider,
      timeRangeStart,
      timeRangeEnd,
    };

    return res.json(ApiResponse.success({ summary }));
  })
);

// GET /api/activity/chart-data - Get time-series data for charts
router.get(
  '/chart-data',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const {
      messageProvider,
      llmProvider,
      startDate,
      endDate,
      interval = 'hour',
    } = req.query as any;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    const now = new Date();
    const startTime = startDate
      ? new Date(startDate)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const endTime = endDate ? new Date(endDate) : now;

    const intervalMs =
      interval === 'hour'
        ? 60 * 60 * 1000
        : interval === 'week'
          ? 7 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    // Real sources: message-flow events (ActivityLogger) and persisted
    // inference logs (inference_logs table).
    const [events, inferenceLogs] = await Promise.all([
      ActivityLogger.getInstance().getEvents({
        startTime,
        endTime,
        provider: messageProvider || undefined,
        limit: Number.MAX_SAFE_INTEGER,
      }),
      dbManager.getInferenceLogs({
        provider: llmProvider || undefined,
        startTime,
        endTime,
        limit: Number.MAX_SAFE_INTEGER,
      }),
    ]);

    const bucketStart = (timestamp: string): number | null => {
      const ts = new Date(timestamp).getTime();
      if (Number.isNaN(ts) || ts < startTime.getTime() || ts > endTime.getTime()) return null;
      const idx = Math.floor((ts - startTime.getTime()) / intervalMs);
      return startTime.getTime() + idx * intervalMs;
    };

    const messageBuckets = new Map<number, number>();
    for (const event of events) {
      const bucket = bucketStart(event.timestamp);
      if (bucket === null) continue;
      messageBuckets.set(bucket, (messageBuckets.get(bucket) || 0) + 1);
    }

    const llmBuckets = new Map<
      number,
      { calls: number; tokens: number; latencyTotal: number; latencySamples: number }
    >();
    for (const log of inferenceLogs) {
      const bucket = bucketStart(log.timestamp);
      if (bucket === null) continue;
      let agg = llmBuckets.get(bucket);
      if (!agg) {
        agg = { calls: 0, tokens: 0, latencyTotal: 0, latencySamples: 0 };
        llmBuckets.set(bucket, agg);
      }
      agg.calls += 1;
      agg.tokens += log.tokensUsed ?? 0;
      if (typeof log.latencyMs === 'number') {
        agg.latencyTotal += log.latencyMs;
        agg.latencySamples += 1;
      }
    }

    const messageActivityData: { timestamp: string; count: number; provider?: string }[] = [];
    const llmUsageData: {
      timestamp: string;
      usage: number;
      tokens: number;
      provider?: string;
      responseTime: number;
    }[] = [];

    // Zero-fill the requested range so charts render a continuous series, but
    // cap enumeration for very large ranges (emit only populated buckets then).
    const MAX_BUCKETS = 2000;
    const totalBuckets = Math.floor((endTime.getTime() - startTime.getTime()) / intervalMs) + 1;
    const bucketTimes: number[] =
      totalBuckets <= MAX_BUCKETS && totalBuckets > 0
        ? Array.from({ length: totalBuckets }, (_, i) => startTime.getTime() + i * intervalMs)
        : Array.from(new Set([...messageBuckets.keys(), ...llmBuckets.keys()])).sort(
            (a, b) => a - b
          );

    for (const time of bucketTimes) {
      const timestamp = new Date(time).toISOString();

      messageActivityData.push({
        timestamp,
        count: messageBuckets.get(time) || 0,
        provider: messageProvider,
      });

      const llmAgg = llmBuckets.get(time);
      llmUsageData.push({
        timestamp,
        usage: llmAgg?.calls || 0,
        tokens: llmAgg?.tokens || 0,
        provider: llmProvider,
        responseTime:
          llmAgg && llmAgg.latencySamples > 0
            ? Math.round(llmAgg.latencyTotal / llmAgg.latencySamples)
            : 0,
      });
    }

    return res.json(
      ApiResponse.success({
        messageActivity: messageActivityData,
        llmUsage: llmUsageData,
        interval,
        filter: { messageProvider, llmProvider, startDate, endDate },
        meta: {
          source: {
            messageActivity: 'activity-log',
            llmUsage: 'inference-logs',
          },
          note: 'Series are derived from recorded events; llmUsage.usage counts inference calls, tokens sums recorded token usage.',
        },
      })
    );
  })
);

// GET /api/activity/agents - Get agent activity statistics
router.get(
  '/agents',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const filter = { ...req.query } as any;
    if (filter.limit) filter.limit = parseInt(filter.limit as string, 10);
    if (filter.offset) filter.offset = parseInt(filter.offset as string, 10);

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    const events = await ActivityLogger.getInstance().getEvents({
      startTime: filter.startDate ? new Date(filter.startDate) : undefined,
      endTime: filter.endDate ? new Date(filter.endDate) : undefined,
      botName: filter.agentId || undefined,
      provider: filter.messageProvider || undefined,
      llmProvider: filter.llmProvider || undefined,
      limit: Number.MAX_SAFE_INTEGER,
    });

    const byAgent = new Map<
      string,
      {
        messageProvider: string;
        llmProvider: string;
        totalMessages: number;
        responseTimeTotal: number;
        responseTimeSamples: number;
        errors: number;
        lastActiveMs: number;
      }
    >();

    for (const event of events) {
      let agg = byAgent.get(event.botName);
      if (!agg) {
        agg = {
          messageProvider: event.provider,
          llmProvider: event.llmProvider || 'unknown',
          totalMessages: 0,
          responseTimeTotal: 0,
          responseTimeSamples: 0,
          errors: 0,
          lastActiveMs: 0,
        };
        byAgent.set(event.botName, agg);
      }
      agg.totalMessages += 1;
      if (typeof event.processingTime === 'number') {
        agg.responseTimeTotal += event.processingTime;
        agg.responseTimeSamples += 1;
      }
      if (event.status === 'error' || event.status === 'timeout') {
        agg.errors += 1;
      }
      const ts = new Date(event.timestamp).getTime();
      if (!Number.isNaN(ts) && ts > agg.lastActiveMs) {
        agg.lastActiveMs = ts;
      }
    }

    const ACTIVE_WINDOW_MS = 60 * 60 * 1000;
    const agentActivity = Array.from(byAgent.entries())
      .map(([botName, agg]) => ({
        agentId: botName,
        agentName: botName,
        messageProvider: agg.messageProvider,
        llmProvider: agg.llmProvider,
        totalMessages: agg.totalMessages,
        averageResponseTime:
          agg.responseTimeSamples > 0
            ? Math.round(agg.responseTimeTotal / agg.responseTimeSamples)
            : 0,
        errorRate: agg.totalMessages > 0 ? agg.errors / agg.totalMessages : 0,
        lastActive: agg.lastActiveMs > 0 ? new Date(agg.lastActiveMs).toISOString() : null,
        status: Date.now() - agg.lastActiveMs <= ACTIVE_WINDOW_MS ? 'active' : 'idle',
      }))
      .sort((a, b) => b.totalMessages - a.totalMessages);

    return res.json(
      ApiResponse.success({
        agents: agentActivity,
        filter,
        meta: {
          source: 'activity-log',
          ...(agentActivity.length === 0
            ? { note: 'No agent activity recorded yet for the requested filter.' }
            : {}),
        },
      })
    );
  })
);

// GET /api/activity/mcp-tools - Get MCP tool usage statistics
router.get(
  '/mcp-tools',
  validateRequest(ActivityFilterSchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const filter = { ...req.query } as any;
    if (filter.limit) filter.limit = parseInt(filter.limit as string, 10);
    if (filter.offset) filter.offset = parseInt(filter.offset as string, 10);

    // No MCP tool-usage telemetry is recorded anywhere yet, so report that
    // honestly instead of fabricating usage statistics.
    return res.json(
      ApiResponse.success({
        mcpTools: [],
        filter,
        meta: {
          note: 'MCP tool usage is not instrumented yet; no per-tool usage statistics are recorded.',
        },
      })
    );
  })
);

// POST /api/activity/log - Log a new activity event (for internal use)
router.post(
  '/log',
  validateRequest(LogActivitySchema),
  asyncErrorHandler(async (req: Request, res: Response) => {
    const {
      agentId,
      messageProvider,
      llmProvider,
      messageType,
      contentLength,
      processingTime,
      status,
      errorMessage,
      mcpToolsUsed,
    } = req.body;

    const dbManager = DatabaseManager.getInstance();
    if (!dbManager.isConnected()) {
      return res
        .status(HTTP_STATUS.SERVICE_UNAVAILABLE)
        .json(ApiResponse.error('Database not connected', 'SERVICE_UNAVAILABLE'));
    }

    debug('Activity logged:', {
      agentId,
      messageProvider,
      llmProvider,
      messageType,
      status,
    });

    return res.json(ApiResponse.success());
  })
);

export default router;
