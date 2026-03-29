import { z } from 'zod';

export const EmptySchema = z.object({
  body: z.object({}).optional(),
});

export const ClearCacheSchema = z.object({
  body: z
    .object({
      keys: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
});

export const ValidationTestSchema = z.object({
  body: z
    .object({
      type: z.string().optional(),
      data: z.any().optional(),
      rules: z.array(z.string()).optional(),
    })
    .passthrough(),
});

export const MarketplacePluginNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1),
  }),
});

export const ImportConfigSchema = z.object({
  body: z
    .object({
      data: z.any(),
    })
    .passthrough(),
});

export const ExportConfigSchema = z.object({
  body: z
    .object({
      configIds: z.array(z.string()).optional(),
      fileName: z.string().optional(),
      format: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const SpecSchema = z.object({
  body: z
    .object({
      content: z.string(),
    })
    .passthrough(),
});

export const ErrorLogSchema = z.object({
  body: z
    .object({
      error: z.string().optional(),
      message: z.string().optional(),
      stack: z.string().optional(),
    })
    .passthrough(),
});

export const CIDeploySchema = z.object({
  body: z
    .object({
      version: z.string().optional(),
      environment: z.string().optional(),
      force: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export const CIRollbackSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const AnomalyResolveSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z
    .object({
      resolution: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const WebhookRetrySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const DashboardFeedbackSchema = z.object({
  body: z
    .object({
      feedback: z.string(),
    })
    .passthrough(),
});

export const AlertIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const ChatGenerateSchema = z.object({
  body: z
    .object({
      prompt: z.string(),
      provider: z.string().optional(),
    })
    .passthrough(),
});

export const ValidateConfigSchema = z.object({
  body: z
    .object({
      config: z.any(),
    })
    .passthrough(),
});

export const DashboardConfigSchema = z.object({
  body: z
    .object({
      layout: z.any().optional(),
      theme: z.string().optional(),
      widgets: z.array(z.any()).optional(),
    })
    .passthrough()
    .optional(),
});

export const BotApplyUpdateSchema = z.object({
  params: z.object({
    botId: z.string().min(1),
  }),
  body: z
    .object({
      approvalId: z.string().optional(),
    })
    .passthrough(),
});

export const ValidateImportSchema = z.object({
  body: z
    .object({
      format: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const BackupRestoreSchema = z.object({
  params: z.object({
    backupId: z.string(),
  }),
});

export const BackupCreateSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      format: z.string().optional(),
      includeVersions: z.boolean().optional(),
      includeAuditLogs: z.boolean().optional(),
      includeTemplates: z.boolean().optional(),
      compress: z.boolean().optional(),
      encrypt: z.boolean().optional(),
      encryptionKey: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
