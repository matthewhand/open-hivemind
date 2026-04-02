import { z } from 'zod';

/** POST /api/config/hot-reload */
export const HotReloadChangeSchema = z.object({
  body: z
    .object({
      changes: z.record(z.unknown()).refine((val) => Object.keys(val).length > 0, {
        message: 'At least one change is required',
      }),
      source: z.string().optional(),
      reason: z.string().optional(),
    })
    .passthrough(),
});

/** POST /api/config/hot-reload/rollback/:snapshotId */
export const HotReloadRollbackSchema = z.object({
  params: z.object({
    snapshotId: z.string().min(1, { message: 'Snapshot ID is required' }),
  }),
});
