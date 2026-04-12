import { z } from 'zod';

// ── Shared profile schema shapes ─────────────────────────────────────────────

const profileKeyField = z.string().min(1, { message: 'Profile key is required' }).max(100);

const profileNameField = z.string().min(1, { message: 'Profile name is required' }).max(200);

const profileProviderField = z
  .string()
  .min(1, { message: 'Profile provider is required' })
  .max(100);

// ── LLM Profile Schemas ─────────────────────────────────────────────────────

export const CreateLlmProfileSchema = z.object({
  body: z.object({
    key: profileKeyField,
    name: profileNameField,
    provider: profileProviderField,
    modelType: z.enum(['chat', 'embedding', 'both']).optional().default('chat'),
    config: z.record(z.unknown()).optional(),
    description: z.string().optional(),
  }),
});

export const UpdateLlmProfileSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
  body: z.object({
    name: profileNameField,
    provider: profileProviderField,
    modelType: z.enum(['chat', 'embedding', 'both']).optional(),
  }),
});

export const LlmProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Message Profile Schemas ──────────────────────────────────────────────────

export const CreateMessageProfileSchema = z.object({
  body: z.object({
    key: profileKeyField,
    name: profileNameField,
    provider: profileProviderField,
    config: z.record(z.unknown()).optional(),
    description: z.string().optional(),
  }),
});

export const UpdateMessageProfileSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
  body: z
    .object({
      name: profileNameField,
      provider: profileProviderField,
    })
    .passthrough(),
});

export const MessageProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Memory Profile Schemas ───────────────────────────────────────────────────

export const CreateMemoryProfileSchema = z.object({
  body: z.object({
    key: profileKeyField,
    name: profileNameField,
    provider: profileProviderField,
  }),
});

export const MemoryProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Tool Profile Schemas ─────────────────────────────────────────────────────

export const CreateToolProfileSchema = z.object({
  body: z.object({
    key: profileKeyField,
    name: profileNameField,
    provider: profileProviderField,
  }),
});

export const ToolProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Response Profile Schemas ─────────────────────────────────────────────────

export const SWARM_MODES = ['exclusive', 'broadcast', 'rotating', 'priority', 'collaborative'] as const;
export type SwarmMode = typeof SWARM_MODES[number];

const responseSettingValue = z.union([z.string(), z.number(), z.boolean()]);

export const CreateResponseProfileSchema = z.object({
  body: z.object({
    key: z
      .string()
      .min(1, { message: 'Profile key is required' })
      .max(100)
      .regex(/^[a-z0-9-]+$/, { message: 'Key must be lowercase alphanumeric with hyphens only' }),
    name: profileNameField,
    description: z.string().max(500).optional(),
    swarmMode: z.enum(SWARM_MODES).optional().default('exclusive'),
    settings: z.record(responseSettingValue).optional(),
  }),
});

export const UpdateResponseProfileSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
  body: z.object({
    name: profileNameField.optional(),
    description: z.string().max(500).optional(),
    swarmMode: z.enum(SWARM_MODES).optional(),
    settings: z.record(responseSettingValue).optional(),
  }),
});

export const ResponseProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});
