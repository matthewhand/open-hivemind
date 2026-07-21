import { z } from 'zod';

export const BotIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
});

/** Shared bot fields accepted on create/update (not stripped by validateRequest). */
const botBodyFields = {
  name: z.string().min(1, { message: 'Bot name is required' }).optional(),
  messageProvider: z.string().optional(),
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),
  llmProfile: z.string().optional(),
  description: z.string().optional(),
  persona: z.string().optional(),
  systemInstruction: z.string().optional(),
  isActive: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  mcpServers: z.array(z.unknown()).optional(),
  mcpGuard: z.record(z.unknown()).optional(),
};

export const CreateBotSchema = z.object({
  body: z.object({
    ...botBodyFields,
    name: z.string().min(1, { message: 'Bot name is required' }),
  }),
});

export const UpdateBotSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  body: z.object(botBodyFields),
});

export const CloneBotSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  body: z.object({
    newName: z.string().min(1, { message: 'New bot name is required' }),
  }),
});

export const BotHistoryQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  query: z.object({
    limit: z
      .string()
      .regex(/^-?\d+$/)
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
    channelId: z.string().optional(),
  }),
});

export const BotActivityQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  query: z.object({
    limit: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20)),
  }),
});

export const UpdateBotStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  body: z.object({
    status: z.enum(['active', 'inactive'], {
      message: 'Status must be either "active" or "inactive"',
    }),
  }),
});

export const BulkDeleteSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, { message: 'At least one bot ID is required' }),
  }),
});

export const BulkActionSchema = z.object({
  body: z.object({
    ids: z.array(z.string()).min(1, { message: 'At least one bot ID is required' }),
  }),
});

export const BotVersionParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
    versionId: z.string().min(1, { message: 'Version ID is required' }),
  }),
});

export const BotImportSchema = z.object({
  body: z.object({
    bots: z.array(z.record(z.unknown())).min(1, { message: 'Bots array must not be empty' }),
  }),
});

export const BotGenerateConfigSchema = z.object({
  body: z.object({
    description: z.string().min(1, { message: 'Description is required' }),
  }),
});

export const BotTestChatSchema = z.object({
  body: z.object({
    botConfig: z.record(z.unknown()),
    message: z.string().min(1, { message: 'Message is required' }),
    history: z.array(z.record(z.unknown())).optional(),
  }),
});

export const BotTaskCreateSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    prompt: z.string().min(1, { message: 'Prompt is required' }),
    intervalMinutes: z.number().min(1, { message: 'Interval must be at least 1 minute' }),
  }),
});

export const BotTaskDeleteSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    taskId: z.string().min(1, { message: 'Task ID is required' }),
  }),
});

export const BotMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    channelId: z.string().min(1, { message: 'Channel ID is required' }),
    message: z.string().min(1, { message: 'Message content is required' }),
  }),
});
