import { z } from 'zod';

export const EmptySchema = z.object({
  body: z.object({}).optional(),
});

export const ClearCacheSchema = z.object({
  body: z
    .object({
      keys: z.array(z.string()).optional(),
    })
    .optional(),
});

export const ValidationTestSchema = z.object({
  body: z.object({
    config: z.record(z.unknown()).optional(),
    type: z.string().optional(),
    data: z.record(z.unknown()).optional(),
    rules: z.array(z.string()).optional(),
  }),
});

export const MarketplacePluginNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1),
  }),
});

export const ImportConfigSchema = z.object({
  body: z.object({
    data: z.record(z.unknown()),
  }),
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
  body: z.object({
    content: z.string(),
  }),
});

export const ErrorLogSchema = z.object({
  body: z.object({
    error: z.string().optional(),
    message: z.string().optional(),
    stack: z.string().optional(),
  }),
});

export const CIDeploySchema = z.object({
  body: z
    .object({
      version: z.string().optional(),
      environment: z.string().optional(),
      force: z.boolean().optional(),
    })
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
    .optional(),
});

export const WebhookRetrySchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const DashboardFeedbackSchema = z.object({
  body: z.object({
    feedback: z.string(),
  }),
});

export const AlertIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const ChatGenerateSchema = z.object({
  body: z.object({
    message: z.string().min(1),
    botName: z.string().min(1),
    channelId: z.string().optional(),
    userId: z.string().optional(),
    userName: z.string().optional(),
  }),
});

export const ValidateConfigSchema = z.object({
  body: z.object({
    config: z.record(z.unknown()),
  }),
});

export const DashboardConfigSchema = z.object({
  body: z
    .object({
      enabled: z.boolean().optional(),
      learningRate: z.number().optional(),
      confidenceThreshold: z.number().optional(),
      recommendationFrequency: z.number().optional(),
      behaviorTracking: z.boolean().optional(),
      personalization: z.boolean().optional(),
      predictiveAnalytics: z.boolean().optional(),
      autoOptimization: z.boolean().optional(),
      layout: z.record(z.unknown()).optional(),
      theme: z.string().optional(),
      widgets: z.array(z.record(z.unknown())).optional(),
    })
    .optional(),
});

export const BotApplyUpdateSchema = z.object({
  params: z.object({
    botId: z.string().min(1),
  }),
  body: z.object({
    approvalId: z.string().optional(),
  }),
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
