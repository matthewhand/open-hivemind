import { z } from 'zod';

export const McpToolTestSchema = z.object({
  body: z.object({
    serverName: z.string().min(1, { message: 'Server name is required' }),
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()).optional(),
  }),
});

export const AddMCPServerSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
    url: z.string().url({ message: 'Valid URL is required' }),
    apiKey: z.string().optional(),
  }),
});

export const MCPServerNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
});

export const CallMCPToolSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
  body: z.object({
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()).optional(),
  }),
});

export const CreateMCPProviderSchema = z.object({
  body: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
    name: z.string().min(1, { message: 'Provider name is required' }),
    type: z.enum(['stdio', 'websocket', 'sse']),
    config: z.record(z.any()),
  }),
});

export const UpdateMCPProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z.object({
    name: z.string().optional(),
    type: z.enum(['stdio', 'websocket', 'sse']).optional(),
    config: z.record(z.any()).optional(),
  }),
});

export const MCPProviderIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
});
