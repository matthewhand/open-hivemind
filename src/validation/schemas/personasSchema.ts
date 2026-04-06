import { z } from 'zod';

const MAX_SYSTEM_PROMPT_LENGTH = 8000;

/** Zod schema for per-persona response behavior overrides. All fields optional. */
export const PersonaResponseBehaviorSchema = z
  .object({
    baseChance: z.number().min(0).max(1).optional(),
    mentionBonus: z.number().optional(),
    leadingMentionBonus: z.number().optional(),
    offTopicPenalty: z.number().optional(),
    botResponsePenalty: z.number().optional(),
    burstTrafficPenalty: z.number().optional(),
    userDensityPenalty: z.number().optional(),
    botRatioPenalty: z.number().optional(),
    onlyWhenSpokenTo: z.boolean().optional(),
    graceWindowMs: z.number().int().min(0).optional(),
    interactiveFollowups: z.boolean().optional(),
    unsolicitedAddressed: z.boolean().optional(),
    unsolicitedUnaddressed: z.boolean().optional(),
  })
  .optional();

/** Schema for PUT /api/personas/:id — update persona */
export const UpdatePersonaRouteSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
  body: z.object({
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
          name: z
            .string()
            .min(1, { message: 'Trait name must not be empty' })
            .max(100, { message: 'Trait name must not exceed 100 characters' }),
          value: z
            .string()
            .min(1, { message: 'Trait value must not be empty' })
            .max(500, { message: 'Trait value must not exceed 500 characters' }),
          weight: z.number().optional(),
          type: z
            .string()
            .max(50, { message: 'Trait type must not exceed 50 characters' })
            .optional(),
        })
      )
      .max(50, { message: 'Traits array must not exceed 50 items' })
      .optional(),
    systemPrompt: z
      .string()
      .min(1, { message: 'System prompt must not be empty' })
      .max(MAX_SYSTEM_PROMPT_LENGTH, {
        message: `System prompt must not exceed ${MAX_SYSTEM_PROMPT_LENGTH} characters`,
      })
      .optional(),
    responseBehavior: PersonaResponseBehaviorSchema,
  }),
});

/** Schema for POST /api/personas/:id/clone — clone persona */
export const ClonePersonaSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
  body: z.object({
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
          name: z
            .string()
            .min(1, { message: 'Trait name must not be empty' })
            .max(100, { message: 'Trait name must not exceed 100 characters' }),
          value: z
            .string()
            .min(1, { message: 'Trait value must not be empty' })
            .max(500, { message: 'Trait value must not exceed 500 characters' }),
          weight: z.number().optional(),
          type: z
            .string()
            .max(50, { message: 'Trait type must not exceed 50 characters' })
            .optional(),
        })
      )
      .max(50, { message: 'Traits array must not exceed 50 items' })
      .optional(),
    systemPrompt: z
      .string()
      .min(1, { message: 'System prompt must not be empty' })
      .max(MAX_SYSTEM_PROMPT_LENGTH, {
        message: `System prompt must not exceed ${MAX_SYSTEM_PROMPT_LENGTH} characters`,
      })
      .optional(),
    responseBehavior: PersonaResponseBehaviorSchema,
  }),
});

/** Schema for DELETE /api/personas/:id */
export const PersonaIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Persona ID is required' }),
  }),
});

/** Schema for DELETE /api/personas/bulk — delete multiple personas */
export const BulkDeletePersonasSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1)).min(1, { message: 'ids must be a non-empty array' }),
  }),
});
