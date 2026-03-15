import { z } from 'zod';

export const ResolveAnomalySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'id is required'),
  }),
});
