import { z } from 'zod';

// Schema for updating global configuration
// configName is optional - if omitted, updates are stored in user-config.json
export const ConfigUpdateSchema = z.object({
  body: z
    .object({
      configName: z.string().optional(), // Now accepts any string or omitted for user config
      updates: z.record(z.any()).optional(), // Optional - can send updates directly
    })
    .catchall(z.any()), // Allow additional properties for direct update format
});

// Schema for restoring configuration from backup
export const ConfigRestoreSchema = z.object({
  body: z.object({
    backupId: z.string().min(1, { message: 'backupId is required' }),
  }),
});

// Schema for creating configuration backup
export const ConfigBackupSchema = z.object({
  body: z.object({}).optional(), // No required body parameters for backup creation
});
