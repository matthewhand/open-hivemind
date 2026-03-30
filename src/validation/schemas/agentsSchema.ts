import { z } from 'zod';

/** Schema for POST /api/agents — create new agent */
export const CreateAgentSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Agent name is required' }),
    messageProvider: z.string().min(1, { message: 'Message provider is required' }),
    llmProvider: z.string().min(1, { message: 'LLM provider is required' }),
    persona: z.string().optional(),
    systemInstruction: z.string().optional(),
    mcpServers: z.array(z.string()).optional().default([]),
    mcpGuard: z
      .object({
        enabled: z.boolean().optional(),
        type: z.enum(['owner', 'custom']).optional(),
        allowedUserIds: z.array(z.string()).optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

/** Schema for PUT /api/agents/:id — update agent */
export const UpdateAgentSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Agent ID is required' }),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    messageProvider: z.string().min(1).optional(),
    llmProvider: z.string().min(1).optional(),
    persona: z.string().optional(),
    systemInstruction: z.string().optional(),
    mcpServers: z.array(z.string()).optional(),
    mcpGuard: z
      .object({
        enabled: z.boolean().optional(),
        type: z.enum(['owner', 'custom']).optional(),
        allowedUserIds: z.array(z.string()).optional(),
      })
      .optional(),
    isActive: z.boolean().optional(),
  }),
});

/** Schema for DELETE /api/agents/:id */
export const AgentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, { message: 'Agent ID is required' }),
  }),
});

/** Schema for POST /api/agents/personas — create persona */
export const CreateAgentPersonaSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    systemPrompt: z.string().min(1, { message: 'System prompt is required' }),
  }),
});

/** Schema for PUT /api/agents/personas/:key — update persona */
export const UpdateAgentPersonaSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Persona key is required' }),
  }),
  body: z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    systemPrompt: z.string().min(1, { message: 'System prompt is required' }),
  }),
});

/** Schema for DELETE /api/agents/personas/:key */
export const AgentPersonaKeyParamSchema = z.object({
  params: z.object({
    key: z.string().min(1, { message: 'Persona key is required' }),
  }),
});
