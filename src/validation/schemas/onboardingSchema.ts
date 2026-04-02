import { z } from 'zod';

export const OnboardingStepSchema = z.object({
  body: z.object({
    step: z.number().int().min(1).max(5),
  }),
});

export const EmptyBodySchema = z.object({
  body: z.object({}).strict().optional(),
});
