import { z } from 'zod';

export const SnapshotIdParamSchema = z.object({
  params: z.object({
    snapshotId: z.string().min(1, { message: 'Snapshot ID is required' }),
  }),
});

export const HotReloadChangeSchema = z.object({
  body: z.object({
    source: z.string().optional(),
    user: z.string().optional(),
    reason: z.string().optional(),
    changes: z.record(z.any()).refine((data) => Object.keys(data).length > 0, {
      message: 'No changes provided',
    }),
  }).passthrough(),
});
