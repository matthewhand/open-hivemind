import { z } from 'zod';

export const ApplyTemplateSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Template ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Bot name is required' }),
    description: z.string().optional(),
    overrides: z.record(z.any()).optional(),
  }),
});

export const CreateTemplateSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Template name is required' }),
    description: z.string().min(1, { message: 'Template description is required' }),
    category: z.enum(['discord', 'slack', 'mattermost', 'webhook', 'llm', 'general'], {
      errorMap: () => ({ message: 'Invalid category' }),
    }),
    tags: z.array(z.string()).optional(),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Config must not be empty',
    }),
  }),
});

export const DeleteTemplateSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Template ID is required' }),
  }),
});
