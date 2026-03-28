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
