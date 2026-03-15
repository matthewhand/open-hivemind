import { z } from 'zod';

export const LogActivitySchema = z.object({
  body: z
    .object({
      agentId: z.string().min(1, 'agentId is required'),
      messageProvider: z.string().min(1, 'messageProvider is required'),
      llmProvider: z.string().min(1, 'llmProvider is required'),
      messageType: z.enum(['incoming', 'outgoing'], { required_error: 'messageType is required' }),
      contentLength: z.number().int().min(0, 'contentLength must be a non-negative integer'),
      processingTime: z.number().optional(),
      status: z.enum(['success', 'error', 'timeout'], { required_error: 'status is required' }),
      errorMessage: z.string().optional(),
      mcpToolsUsed: z.array(z.string()).optional(),
    })
    .passthrough(),
});
