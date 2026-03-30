import { z } from 'zod';

export const BotIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
});

export const CreateBotSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Bot name is required' }),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
    persona: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const UpdateBotSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Bot ID is required' }),
  }),
  body: z.object({
    name: z.string().optional(),
    messageProvider: z.string().optional(),
    llmProvider: z.string().optional(),
    persona: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
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
