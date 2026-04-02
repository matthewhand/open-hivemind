import { z } from 'zod';

export const EmptyBodySchema = z.object({
  body: z.object({}).strict().optional(),
});
