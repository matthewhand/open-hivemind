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
  body: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
    name: z.string().min(1, { message: 'Provider name is required' }),
    type: z.string().min(1, { message: 'Provider type is required' }),
  }),
});

/** Schema for PUT /api/mcp/providers/:id — update MCP provider */
export const UpdateMCPProviderSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Provider ID is required' }),
  }),
  body: CreateMCPProviderSchema.shape.body.partial(),
});

/** Schema for POST /api/mcp/tools/history — save tool execution history */
export const SaveToolExecutionSchema = z.object({
  body: z.object({
    id: z.string().min(1, { message: 'Execution ID is required' }),
    serverName: z.string().min(1, { message: 'Server name is required' }),
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()),
    result: z.any(),
    error: z.string().optional(),
    status: z.enum(['success', 'error']),
    executedAt: z.string(),
    duration: z.number(),
    userId: z.string().optional(),
  }),
});

/** Schema for GET /api/mcp/tools/history — get tool execution history */
export const GetToolExecutionHistorySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
    serverName: z.string().optional(),
    toolName: z.string().optional(),
    status: z.enum(['success', 'error']).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
  }).optional(),
});

/** Schema for GET /api/mcp/tools/history/:id — get specific execution result */
export const GetToolExecutionByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Execution ID is required' }),
  }),
});

/** Schema for POST /api/mcp/tools/:id/toggle — toggle tool enabled/disabled state */
export const ToggleToolSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Tool ID is required' }),
  }),
  body: z.object({
    enabled: z.boolean(),
    serverName: z.string().min(1, { message: 'Server name is required' }),
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    userId: z.string().optional(),
  }),
});

/** Schema for POST /api/mcp/tools/bulk-toggle — bulk enable/disable tools */
export const BulkToggleToolsSchema = z.object({
  body: z.object({
    tools: z.array(z.object({
      toolId: z.string().min(1),
      serverName: z.string().min(1),
      toolName: z.string().min(1),
    })),
    enabled: z.boolean(),
    userId: z.string().optional(),
  }),
});

/** Schema for GET /api/mcp/tools/:id/preference — get tool preference */
export const GetToolPreferenceSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Tool ID is required' }),
  }),
});
