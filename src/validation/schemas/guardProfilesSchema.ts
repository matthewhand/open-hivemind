import { z } from 'zod';

// Email regex for user ID validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates user IDs (email format)
const userIdString = z
  .string()
  .min(1, { message: 'User ID cannot be empty' })
  .regex(emailRegex, { message: 'User ID must be a valid email address' });

// Validates tool names (alphanumeric with common separators)
const toolNameString = z
  .string()
  .min(1, { message: 'Tool name cannot be empty' })
  .max(100, { message: 'Tool name must be 100 characters or fewer' })
  .regex(/^[a-zA-Z0-9_\-.:]+$/, {
    message:
      'Tool name can only contain letters, numbers, underscores, hyphens, periods, and colons',
  });

// Validates blocked terms (non-empty strings with reasonable length)
const blockedTermString = z
  .string()
  .min(1, { message: 'Blocked term cannot be empty' })
  .max(100, { message: 'Blocked term must be 100 characters or fewer' });

const mcpGuardSchema = z
  .object({
    enabled: z.boolean().optional(),
    type: z.enum(['owner', 'custom'], { message: 'mcpGuard type must be owner or custom' }),
    allowedUsers: z
      .array(userIdString)
      .optional()
      .transform((arr) => (arr ? arr.filter(Boolean) : arr)),
    allowedTools: z
      .array(toolNameString)
      .optional()
      .transform((arr) => (arr ? arr.filter(Boolean) : arr)),
  })
  .optional();

const rateLimitSchema = z
  .object({
    enabled: z.boolean().optional(),
    maxRequests: z
      .number()
      .int({ message: 'maxRequests must be an integer' })
      .min(1, { message: 'maxRequests must be at least 1' })
      .max(1000000, { message: 'maxRequests must not exceed 1,000,000' })
      .optional(),
    windowMs: z
      .number()
      .int({ message: 'windowMs must be an integer' })
      .positive({ message: 'windowMs must be positive' })
      .optional(),
  })
  .optional();

const contentFilterSchema = z
  .object({
    enabled: z.boolean().optional(),
    strictness: z.enum(['low', 'medium', 'high'], {
      message: 'strictness must be low, medium, or high',
    }),
    blockedTerms: z
      .array(blockedTermString)
      .optional()
      .transform((arr) => (arr ? arr.filter(Boolean) : arr)),
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
    name: z
      .string()
      .min(1, { message: 'Name is required and must be a string' })
      .max(255, { message: 'Name must be 255 characters or fewer' })
      .regex(/^[a-zA-Z0-9\s\-_.()]+$/, {
        message:
          'Name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses',
      }),
    description: z.string().optional(),
    guards: guardsObject,
  }),
});

/** Schema for PUT /:id — update a guard profile */
export const UpdateGuardProfileSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Profile ID is required' }),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, { message: 'Name is required and must be a string' })
      .max(255, { message: 'Name must be 255 characters or fewer' })
      .regex(/^[a-zA-Z0-9\s\-_.()]+$/, {
        message:
          'Name can only contain letters, numbers, spaces, hyphens, underscores, periods, and parentheses',
      })
      .optional(),
    description: z.string().optional(),
    guards: guardsObject.partial().optional(),
  }),
});

/** Schema for GET/DELETE /:id — param-only routes */
export const GuardProfileIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Profile ID is required' }),
  }),
});

/** Schema for POST /bulk/delete — bulk delete guard profiles */
export const BulkDeleteGuardProfilesSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1, { message: 'Each ID must be a non-empty string' })).min(1, {
      message: 'At least one profile ID is required',
    }),
  }),
});

/** Schema for POST /bulk/toggle — bulk toggle guard profiles */
export const BulkToggleGuardProfilesSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1, { message: 'Each ID must be a non-empty string' })).min(1, {
      message: 'At least one profile ID is required',
    }),
    enabled: z.boolean({ message: 'Enabled must be a boolean value' }),
  }),
});
