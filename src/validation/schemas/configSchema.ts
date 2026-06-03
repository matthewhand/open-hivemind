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

// Schema for POST /api/webui/config — the dashboard layout / user-preference endpoint.
// Only fields safe for any authenticated user are permitted. Provider/agent arrays
// (agents, mcpServers, llmProviders, messengerProviders, personas, guards) are
// intentionally excluded to prevent config poisoning. Unknown keys are rejected.
export const WebuiConfigUpdateSchema = z.object({
  body: z
    .object({
      layout: z.array(z.string().min(1).max(100)).max(50).optional(),
    })
    .strict(),
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
