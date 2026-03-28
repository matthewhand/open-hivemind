import { z } from 'zod';

// ── Reusable Validators ──────────────────────────────────────────────────────

/** Validates a non-empty trimmed string for name-like fields */
export const nameString = (field = 'Name') =>
  z
    .string({ required_error: `${field} is required` })
    .min(1, { message: `${field} is required` })
    .max(200, { message: `${field} must be 200 characters or fewer` });

/** Validates a non-empty trimmed string for key/identifier fields (alphanumeric + hyphens/underscores) */
export const keyString = (field = 'Key') =>
  z
    .string({ required_error: `${field} is required` })
    .min(1, { message: `${field} is required` })
    .max(100, { message: `${field} must be 100 characters or fewer` })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message: `${field} can only contain letters, numbers, underscores, and hyphens`,
    });

/** Validates a generic ID path parameter */
export const idParam = (field = 'id') => z.string().min(1, { message: `${field} is required` });

/** Validates pagination query parameters */
export const PaginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    offset: z.coerce.number().int().nonnegative().optional(),
  }),
});

/** Schema for a route that only needs an :id param */
export const IdParamSchema = z.object({
  params: z.object({
    id: idParam('ID'),
  }),
});

/** Schema for a route that only needs a :key param */
export const KeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Key parameter is required' }),
  }),
});

/** Schema for a route that only needs a :name param */
export const NameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Name parameter is required' }),
  }),
});

/** Schema for reorder endpoints that accept an array of IDs */
export const ReorderSchema = z.object({
  body: z.object({
    ids: z.array(z.string().min(1)).min(1, { message: 'ids must be a non-empty array' }),
  }),
});

/** Schema for toggle endpoints that accept a boolean enabled field */
export const ToggleEnabledSchema = z.object({
  params: z.object({
    id: idParam('ID'),
  }),
  body: z.object({
    enabled: z.boolean({ required_error: 'enabled is required and must be a boolean' }),
  }),
});
