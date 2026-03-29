import { z } from 'zod';

/** Schema for PUT /api/personas/:id — update persona */
export const UpdatePersonaRouteSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().min(1).max(500).optional(),
      category: z
        .enum([
          'general',
          'customer_service',
          'creative',
          'technical',
          'educational',
          'entertainment',
          'professional',
        ])
        .optional(),
      traits: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
            weight: z.number().optional(),
            type: z.string().optional(),
          })
        )
        .optional(),
      systemPrompt: z.string().min(1).optional(),
    })
    .passthrough(),
});

/** Schema for POST /api/personas/:id/clone — clone persona */
export const ClonePersonaSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1).max(100).optional(),
    })
    .passthrough(),
});

/** Schema for DELETE /api/personas/:id */
export const PersonaIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
});
