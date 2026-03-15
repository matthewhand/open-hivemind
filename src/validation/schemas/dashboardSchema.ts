import { z } from 'zod';

export const AIConfigSchema = z.object({
  body: z.object({}).passthrough(),
});

export const AIFeedbackSchema = z.object({
  body: z
    .object({
      recommendationId: z.string().min(1, 'recommendationId is required'),
      feedback: z.string().min(1, 'feedback is required'),
      metadata: z.record(z.any()).optional(),
    })
    .passthrough(),
});

export const AlertIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Alert ID is required'),
  }),
});
