import { z } from 'zod';

export const EndpointIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
  body: z.object({
    url: z.string().url().optional(),
    method: z.string().optional(),
    name: z.string().optional(),
    interval: z.number().optional(),
    expectedStatus: z.number().optional(),
    timeout: z.number().optional(),
    enabled: z.boolean().optional(),
  }).passthrough().optional(),
});

export const CleanupConfigSchema = z.object({
  body: z.object({}).passthrough().optional(),
});

export const ApiEndpointConfigSchema = z.object({
  body: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    url: z.string().url({ message: 'Valid URL is required' }),
    name: z.string().min(1, { message: 'Name is required' }),
    method: z.string().optional(),
    interval: z.number().optional(),
    expectedStatus: z.number().optional(),
    timeout: z.number().optional(),
    enabled: z.boolean().optional(),
  }).passthrough(),
});
