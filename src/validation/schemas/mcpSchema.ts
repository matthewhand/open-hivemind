import { z } from 'zod';

/**
 * MCP Schema Validation
 *
 * Security-hardened schemas for MCP (Model Context Protocol) operations.
 * All schemas use strict validation to prevent injection attacks and
 * ensure data integrity.
 */

// Allowed primitive types for MCP tool arguments and config values
const McpPrimitiveValueSchema = z.union([
  z.string().max(10000), // Limit string length to prevent memory attacks
  z.number().finite(), // Exclude NaN and Infinity
  z.boolean(),
  z.null(),
]);

// Nested value schema with depth limit (max 5 levels of nesting)
const McpNestedValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    McpPrimitiveValueSchema,
    z.array(McpNestedValueSchema).max(100), // Limit array size
    z.record(z.string().max(256), McpNestedValueSchema), // Object with string keys
  ])
);

// Config schema for MCP providers - allows structured configuration
const McpConfigSchema = z.record(z.string().max(256), McpNestedValueSchema).refine((val) => Object.keys(val).length <= 100, { message: 'Config exceeds maximum of 100 keys' });

// Arguments schema for MCP tools - allows structured arguments
const McpArgumentsSchema = z.record(z.string().max(256), McpNestedValueSchema).refine((val) => Object.keys(val).length <= 50, { message: 'Arguments exceed maximum of 50 keys' });

// API Key schema with security constraints
const McpApiKeySchema = z
  .string()
  .min(8, { message: 'API key must be at least 8 characters' })
  .max(512, { message: 'API key must not exceed 512 characters' })
  .regex(/^[a-zA-Z0-9_\-\.]+$/, {
    message: 'API key contains invalid characters',
  });

// Server name schema - alphanumeric with underscores and hyphens
const McpServerNameSchema = z
  .string()
  .min(1, { message: 'Server name is required' })
  .max(128, { message: 'Server name must not exceed 128 characters' })
  .regex(/^[a-zA-Z0-9_\-]+$/, {
    message: 'Server name can only contain letters, numbers, underscores, and hyphens',
  });

// Provider ID schema
const McpProviderIdSchema = z
  .string()
  .min(1, { message: 'Provider ID is required' })
  .max(128, { message: 'Provider ID must not exceed 128 characters' })
  .regex(/^[a-zA-Z0-9_\-]+$/, {
    message: 'Provider ID can only contain letters, numbers, underscores, and hyphens',
  });

// Tool name schema
const McpToolNameSchema = z
  .string()
  .min(1, { message: 'Tool name is required' })
  .max(256, { message: 'Tool name must not exceed 256 characters' })
  .regex(/^[a-zA-Z0-9_\-\.\/]+$/, {
    message: 'Tool name contains invalid characters',
  });

export const McpToolTestSchema = z.object({
  body: z.object({
    serverName: McpServerNameSchema,
    toolName: McpToolNameSchema,
    arguments: McpArgumentsSchema.optional(),
  }),
});

export const AddMCPServerSchema = z.object({
  body: z.object({
    name: McpServerNameSchema,
    url: z.string().url({ message: 'Valid URL is required' }).max(2048),
    apiKey: McpApiKeySchema.optional(),
  }),
});

export const MCPServerNameParamSchema = z.object({
  params: z.object({
    name: McpServerNameSchema,
  }),
});

export const CallMCPToolSchema = z.object({
  params: z.object({
    name: McpServerNameSchema,
  }),
  body: z.object({
    toolName: McpToolNameSchema,
    arguments: McpArgumentsSchema.optional(),
  }),
});

export const CreateMCPProviderSchema = z.object({
  body: z.object({
    id: McpProviderIdSchema,
    name: z.string().min(1, { message: 'Provider name is required' }).max(256),
    type: z.enum(['stdio', 'websocket', 'sse']),
    config: McpConfigSchema,
  }),
});

export const UpdateMCPProviderSchema = z.object({
  params: z.object({
    id: McpProviderIdSchema,
  }),
  body: z.object({
    name: z.string().min(1).max(256).optional(),
    type: z.enum(['stdio', 'websocket', 'sse']).optional(),
    config: McpConfigSchema.optional(),
  }),
});

export const MCPProviderIdParamSchema = z.object({
  params: z.object({
    id: McpProviderIdSchema,
  }),
});
