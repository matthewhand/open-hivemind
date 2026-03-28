import { z } from 'zod';

/** DELETE /api/import-export/backups/:backupId */
export const BackupIdParamSchema = z.object({
  params: z.object({
    backupId: z.string().min(1, { message: 'Backup ID is required' }),
  }),
});

/** POST /api/bots/import */
export const ImportBotsSchema = z.object({
  body: z.object({
    bots: z
      .array(z.object({ name: z.string().optional() }).passthrough())
      .min(1, { message: 'Request body must contain a non-empty "bots" array' }),
  }),
});
