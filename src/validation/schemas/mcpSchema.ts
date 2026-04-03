import { z } from 'zod';

export const McpToolTestSchema = z.object({
  body: z.object({
    serverName: z.string().min(1, { message: 'Server name is required' }),
    toolName: z.string().min(1, { message: 'Tool name is required' }),
    arguments: z.record(z.any()).optional(),
  }),
});

export const CreateMCPProviderSchema = z.any();
export const MCPProviderIdParamSchema = z.object({ params: z.object({ id: z.string() }) });
export const UpdateMCPProviderSchema = z.any();
export const AddMCPServerSchema = z.any();
export const CallMCPToolSchema = z.any();
export const MCPServerNameParamSchema = z.object({ params: z.object({ name: z.string() }) });
