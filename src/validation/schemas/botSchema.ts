import { z } from 'zod';

// Schema for bot ID parameter
export const BotIdParamSchema = z.object({
  params: z.object({
    botId: z.string().min(1, { message: 'Bot ID is required' })
  })
});

// Schema for creating a new bot
export const CreateBotSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: 'Name must be at least 3 characters' }),
    messageProvider: z.string().min(1, { message: 'Message provider is required' }),
    llmProvider: z.string().min(1, { message: 'LLM provider is required' }),
    config: z.record(z.any()).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
});

// Schema for updating a bot
export const UpdateBotSchema = z.object({
  body: z.object({
    name: z.string().min(3, { message: 'Name must be at least 3 characters' }).optional(),
    messageProvider: z.string().min(1, { message: 'Message provider is required' }).optional(),
    llmProvider: z.string().min(1, { message: 'LLM provider is required' }).optional(),
    config: z.record(z.any()).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  })
});

// Schema for cloning a bot
export const CloneBotSchema = z.object({
  body: z.object({
    newName: z.string().min(3, { message: 'New name must be at least 3 characters' }),
    cloneConfig: z.boolean().optional().default(true),
    cloneHistory: z.boolean().optional().default(false),
  })
});

// Schema for starting/stopping a bot
export const BotActionSchema = z.object({
  params: z.object({
    botId: z.string().min(1, { message: 'Bot ID is required' })
  })
});

// Schema for getting bot templates
export const BotTemplatesSchema = z.object({});