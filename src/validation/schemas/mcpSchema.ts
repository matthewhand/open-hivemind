import { z } from 'zod';

export const AddMCPServerSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    url: z.string().url({ message: 'URL must be a valid URL' }),
    apiKey: z.string().optional(),
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

/** Schema for routes that only need a :name param (connect, disconnect, delete server) */
export const MCPServerNameParamSchema = z.object({
  params: z.object({
    name: z.string().min(1, { message: 'Server name is required' }),
  }),
});

/** Schema for routes that only need a :id param (MCP provider routes) */
export const MCPProviderIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
});

/** Schema for POST /api/mcp/providers — create new MCP provider */
export const CreateMCPProviderSchema = z.object({
  body: z
    .object({
      id: z.string().min(1, { message: 'Provider ID is required' }),
      name: z.string().min(1, { message: 'Provider name is required' }),
      type: z.string().min(1, { message: 'Provider type is required' }),
    })
    .passthrough(),
});

/** Schema for PUT /api/mcp/providers/:id — update MCP provider */
export const UpdateMCPProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: z.object({}).passthrough(),
});
