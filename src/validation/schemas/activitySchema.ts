import { z } from 'zod';

export const LogActivitySchema = z.object({
  body: z.object({
    agentId: z.string().optional(),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
  }).passthrough(),
});
