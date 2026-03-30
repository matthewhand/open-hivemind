import { z } from 'zod';

/** Schema for POST /api/integrations — create new provider instance */
export const CreateIntegrationSchema = z.object({
  body: z.object({
    type: z.string().min(1, { message: 'type is required' }),
    category: z.string().min(1, { message: 'category is required' }),
    name: z.string().min(1, { message: 'name is required' }),
    config: z.record(z.any()).optional(),
    enabled: z.boolean().optional(),
  }),
});

/** Schema for PUT /api/integrations/:id — update provider instance */
export const UpdateIntegrationSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Integration ID is required' }),
  }),
  body: CreateIntegrationSchema.shape.body.partial(),
});

/** Schema for GET/DELETE /api/integrations/:id */
export const IntegrationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Integration ID is required' }),
  }),
});
