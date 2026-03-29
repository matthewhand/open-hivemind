import { z } from 'zod';

const mcpGuardSchema = z
  .object({
    enabled: z.boolean().optional(),
    type: z.enum(['owner', 'custom'], { message: 'mcpGuard type must be owner or custom' }),
    allowedUsers: z.array(z.string()).optional(),
    allowedTools: z.array(z.string()).optional(),
  })
  .optional();

const rateLimitSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxRequests: z.number().int().positive().optional(),
    windowMs: z.number().int().positive().optional(),
  })
  .optional();

const contentFilterSchema = z
  .object({
    enabled: z.boolean().optional(),
    strictness: z.enum(['low', 'medium', 'high'], {
      message: 'strictness must be low, medium, or high',
    }),
    blockedTerms: z.array(z.string()).optional(),
  })
  .optional();

const guardsObject = z.object({
  mcpGuard: mcpGuardSchema,
  rateLimit: rateLimitSchema,
  contentFilter: contentFilterSchema,
});

/** Schema for POST / — create a new guard profile */
export const CreateGuardProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required and must be a string' }),
    description: z.string().optional(),
    guards: guardsObject,
  }),
});

/** Schema for PUT /:id — update a guard profile */
export const UpdateGuardProfileSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Profile ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      guards: guardsObject.partial().optional(),
    })
    .passthrough(),
});

/** Schema for GET/DELETE /:id — param-only routes */
export const GuardProfileIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Profile ID is required' }),
  }),
});
