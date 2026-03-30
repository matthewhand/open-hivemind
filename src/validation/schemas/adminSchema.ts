import { z } from 'zod';

export const ToolUsageGuardSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: 'Name is required' }),
      description: z.string().optional(),
      toolId: z.string().min(1, { message: 'ToolId is required' }),
      guardType: z.enum(['owner_only', 'user_list', 'role_based'], {
        message: 'guardType must be one of: owner_only, user_list, role_based',
      }),
      allowedUsers: z.array(z.string()).optional(),
      allowedRoles: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    })
    .passthrough(),
});

export const UpdateToolUsageGuardSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Guard ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: 'Name is required' }),
      description: z.string().optional(),
      toolId: z.string().min(1, { message: 'ToolId is required' }),
      guardType: z.enum(['owner_only', 'user_list', 'role_based'], {
        message: 'guardType must be one of: owner_only, user_list, role_based',
      }),
      allowedUsers: z.array(z.string()).optional(),
      allowedRoles: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    })
    .passthrough(),
});

export const ToggleIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
});

export const ToggleProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
  body: z
    .object({
      isActive: z.boolean({ required_error: 'isActive is required' }),
    })
    .passthrough(),
});

export const LlmProviderSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: 'Name, type, and config are required' }),
      type: z.string().min(1, { message: 'Name, type, and config are required' }),
      config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
        message: 'Name, type, and config are required',
      }),
    })
    .passthrough(),
});

export const UpdateLlmProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: 'Name, type, and config are required' }),
      type: z.string().min(1, { message: 'Name, type, and config are required' }),
      config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
        message: 'Name, type, and config are required',
      }),
    })
    .passthrough(),
});

export const MessengerProviderSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: 'Name, type, and config are required' }),
      type: z.string().min(1, { message: 'Name, type, and config are required' }),
      config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
        message: 'Name, type, and config are required',
      }),
    })
    .passthrough(),
});

export const UpdateMessengerProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: 'Name, type, and config are required' }),
      type: z.string().min(1, { message: 'Name, type, and config are required' }),
      config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
        message: 'Name, type, and config are required',
      }),
    })
    .passthrough(),
});

export const PersonaSchema = z.object({
  body: z
    .object({
      key: z.string().regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid format' }),
      name: z.string().min(1, { message: 'Key, name, and systemPrompt are required' }),
      systemPrompt: z.string().min(1, { message: 'Key, name, and systemPrompt are required' }),
    })
    .passthrough(),
});

export const UpdatePersonaSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Persona key is required' }),
  }),
  body: z
    .object({
      name: z.string().min(1, { message: 'Name and systemPrompt are required' }),
      systemPrompt: z.string().min(1, { message: 'Name and systemPrompt are required' }),
    })
    .passthrough(),
});

export const PersonaKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Persona key is required' }),
  }),
});

export const ServerNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
});

export const McpServerTestSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    serverUrl: z.string().url({ message: 'Server URL must be a valid URL' }),
    apiKey: z.string().optional(),
  }),
});

export const McpServerConnectSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
    serverUrl: z.string().url({ message: 'Server URL must be a valid URL' }),
    apiKey: z.string().optional(),
  }),
});

export const McpServerDisconnectSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
});
