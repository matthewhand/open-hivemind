import { z } from 'zod';
import { idParam } from './commonSchema';

/** POST /webui/api/secure-config */
export const CreateSecureConfigSchema = z.object({
  body: z.object({
    id: z.string().min(1, { message: 'id is required' }),
    name: z.string().min(1, { message: 'name is required' }),
    type: z.string().min(1, { message: 'type is required' }),
    data: z.record(z.unknown()).refine((val) => val !== null && val !== undefined, {
      message: 'data is required',
    }),
  }),
});

/** PUT /webui/api/secure-config/:id */
export const UpdateSecureConfigSchema = z.object({
  params: z.object({
    id: idParam('Config ID'),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'name is required' }),
    type: z.string().min(1, { message: 'type is required' }),
    data: z.record(z.unknown()).refine((val) => val !== null && val !== undefined, {
      message: 'data is required',
    }),
  }),
});

/** DELETE /webui/api/secure-config/:id */
export const DeleteSecureConfigSchema = z.object({
  params: z.object({
    id: idParam('Config ID'),
  }),
});

/** POST /webui/api/secure-config/restore/:backupId */
export const RestoreSecureConfigBackupSchema = z.object({
  params: z.object({
    backupId: z.string().min(1, { message: 'Backup ID is required' }),
  }),
});

/** Aliases */
export const SecureConfigIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
});

export const BackupIdParamSchema = RestoreSecureConfigBackupSchema;
