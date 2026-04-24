import { z } from 'zod';

/** POST /api/activity/log — log a new activity event */
export const LogActivitySchema = z.object({
  body: z.object({
    agentId: z.string().optional(),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
    messageType: z.string().optional(),
    contentLength: z.number().int().nonnegative().optional(),
    processingTime: z.number().nonnegative().optional(),
    status: z.string().optional(),
    errorMessage: z.string().optional(),
    mcpToolsUsed: z.array(z.string()).optional(),
  }),
});

/** GET /api/activity/messages, llm-usage, summary, chart-data, agents, mcp-tools */
export const ActivityFilterSchema = z.object({
  query: z.object({
    agentId: z.string().optional(),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 100)),
    offset: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 0)),
    interval: z.enum(['hour', 'day', 'week']).optional(),
  }),
});
