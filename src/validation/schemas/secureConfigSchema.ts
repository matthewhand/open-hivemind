import { z } from 'zod';

export const SecureConfigIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
});

export const BackupIdParamSchema = z.object({
  params: z.object({
    backupId: z.string().min(1, { message: 'Backup ID is required' }),
  }),
});

export const CreateSecureConfigSchema = z.object({
  body: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
    name: z.string().min(1, { message: 'Name is required' }),
    type: z.string().min(1, { message: 'Type is required' }),
    data: z.any({ required_error: 'Data is required' }),
  }),
});

export const UpdateSecureConfigSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    type: z.string().min(1, { message: 'Type is required' }),
    data: z.any({ required_error: 'Data is required' }),
  }),
});
