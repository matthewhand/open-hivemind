import { z } from 'zod';

export const McpToolTestSchema = z.object({
  body: z.object({
    serverName: z.string().min(1, { message: 'Server name is required' }),
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()).optional(),
  }),
});
