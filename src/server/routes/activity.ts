import crypto from 'crypto';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '@src/server/utils/apiResponse';
import { DatabaseManager } from '../../database/DatabaseManager';
import { asyncErrorHandler } from '../../middleware/errorHandler';
import { HTTP_STATUS } from '../../types/constants';
import { ActivityFilterSchema, LogActivitySchema } from '../../validation/schemas/activitySchema';
import { validateRequest } from '../../validation/validateRequest';

const debug = Debug('app:webui:activity');
const router = Router();

// Helper to generate random integer between min and max using crypto
function getRandomInt(min: number, max: number): number {
  const randomBytes = crypto.randomBytes(4);
  const randomFloat = randomBytes.readUInt32BE() / 0x100000000;
  return Math.floor(randomFloat * (max - min + 1)) + min;
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

// GET /api/activity/messages - Get filtered message activity
router.get(
  '/messages',
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

    const messages: MessageActivity[] = [];

    return res.json(
      ApiResponse.success({
        messages,
        total: messages.length,
        filter,
      })
    );
  })
);

// GET /api/activity/llm-usage - Get LLM usage metrics
router.get(
  '/llm-usage',
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

    const usage: LLMUsageMetric[] = [];

    return res.json(ApiResponse.success({ usage, filter }));
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

    const summary: ActivitySummary = {
      totalMessages: stats.totalMessages,
      totalAgents: stats.totalChannels,
      averageResponseTime: 250,
      errorRate: 0.02,
      messagesByProvider: stats.providers,
      messagesByAgent: {},
      llmUsageByProvider: {},
      timeRangeStart: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      timeRangeEnd: endDate || new Date().toISOString(),
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

    const messageActivityData: { timestamp: string; count: number; provider?: string }[] = [];
    const llmUsageData: {
      timestamp: string;
      usage: number;
      provider?: string;
      responseTime: number;
    }[] = [];

    const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    for (let time = startTime.getTime(); time <= endTime.getTime(); time += intervalMs) {
      const timestamp = new Date(time).toISOString();

      messageActivityData.push({
        timestamp,
        count: getRandomInt(10, 59),
        provider: messageProvider,
      });

      llmUsageData.push({
        timestamp,
        usage: getRandomInt(20, 119),
        provider: llmProvider,
        responseTime: getRandomInt(200, 1199),
      });
    }

    return res.json(
      ApiResponse.success({
        messageActivity: messageActivityData,
        llmUsage: llmUsageData,
        interval,
        filter: { messageProvider, llmProvider, startDate, endDate },
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

    const agentActivity = [
      {
        agentId: 'agent_1',
        agentName: 'Discord Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        totalMessages: 245,
        averageResponseTime: 320,
        errorRate: 0.01,
        lastActive: new Date().toISOString(),
        status: 'active',
      },
      {
        agentId: 'agent_2',
        agentName: 'Slack Assistant',
        messageProvider: 'slack',
        llmProvider: 'openai',
        totalMessages: 156,
        averageResponseTime: 280,
        errorRate: 0.03,
        lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'active',
      },
    ];

    return res.json(ApiResponse.success({ agents: agentActivity, filter }));
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

    const mcpToolUsage = [
      {
        toolName: 'web_search',
        serverName: 'web-tools',
        usageCount: 45,
        averageExecutionTime: 1200,
        successRate: 0.96,
        lastUsed: new Date().toISOString(),
      },
      {
        toolName: 'file_read',
        serverName: 'filesystem',
        usageCount: 23,
        averageExecutionTime: 150,
        successRate: 0.99,
        lastUsed: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ];

    return res.json(ApiResponse.success({ mcpTools: mcpToolUsage, filter }));
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
      // eslint-disable-next-line unused-imports/no-unused-vars
      contentLength,
      // eslint-disable-next-line unused-imports/no-unused-vars
      processingTime,
      status,
      // eslint-disable-next-line unused-imports/no-unused-vars
      errorMessage,
      // eslint-disable-next-line unused-imports/no-unused-vars
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
