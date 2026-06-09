import { z } from 'zod';

export const ToggleIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
});

export const ToggleProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'ID is required' }),
  }),
  body: z.object({
    isActive: z.boolean({ required_error: 'isActive is required' }),
  }),
});

export const LlmProviderSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name, type, and config are required' }),
    type: z.string().min(1, { message: 'Name, type, and config are required' }),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Name, type, and config are required',
    }),
  }),
});

export const UpdateLlmProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Name, type, and config are required' }),
    type: z.string().min(1, { message: 'Name, type, and config are required' }),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Name, type, and config are required',
    }),
  }),
});

export const MessengerProviderSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name, type, and config are required' }),
    type: z.string().min(1, { message: 'Name, type, and config are required' }),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Name, type, and config are required',
    }),
  }),
});

export const UpdateMessengerProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Name, type, and config are required' }),
    type: z.string().min(1, { message: 'Name, type, and config are required' }),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Name, type, and config are required',
    }),
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

export const McpServerBulkDisconnectSchema = z.object({
  body: z.object({
    names: z.array(z.string().min(1)).min(1, { message: 'At least one server name is required' }),
  }),
});

export const TestConnectionSchema = z.object({
  body: z.object({
    providerType: z.string().min(1, { message: 'Provider type is required' }),
    config: z.record(z.any()).refine((val) => Object.keys(val).length > 0, {
      message: 'Config is required',
    }),
  }),
});
