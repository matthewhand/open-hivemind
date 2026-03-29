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
  body: z
    .object({
      key: profileKeyField,
      name: profileNameField,
      provider: profileProviderField,
      modelType: z.enum(['chat', 'embedding', 'both']).optional().default('chat'),
    })
    .passthrough(),
});

export const UpdateLlmProfileSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
  body: z
    .object({
      name: profileNameField,
      provider: profileProviderField,
      modelType: z.enum(['chat', 'embedding', 'both']).optional(),
    })
    .passthrough(),
});

export const LlmProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Message Profile Schemas ──────────────────────────────────────────────────

export const CreateMessageProfileSchema = z.object({
  body: z
    .object({
      key: profileKeyField,
      name: profileNameField,
      provider: profileProviderField,
    })
    .passthrough(),
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
  body: z
    .object({
      key: profileKeyField,
      name: profileNameField,
      provider: profileProviderField,
    })
    .passthrough(),
});

export const MemoryProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});

// ── Tool Profile Schemas ─────────────────────────────────────────────────────

export const CreateToolProfileSchema = z.object({
  body: z
    .object({
      key: profileKeyField,
      name: profileNameField,
      provider: profileProviderField,
    })
    .passthrough(),
});

export const ToolProfileKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Profile key is required' }),
  }),
});
