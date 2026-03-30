import { z } from 'zod';

export const AddMCPServerSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    url: z.string().url({ message: 'URL must be a valid URL' }),
    apiKey: z.string().optional(),
  }),
});

export const CallMCPToolSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
  body: z.object({
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()).optional(),
  }),
});
