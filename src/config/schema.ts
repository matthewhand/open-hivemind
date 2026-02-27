import { z } from 'zod';

// ============================================================================
// Platform Configurations
// ============================================================================

export const DiscordConfigSchema = z.object({
  token: z.string().min(1, "Discord bot token is required"),
  clientId: z.string().optional(),
  guildId: z.string().optional(),
  channelId: z.string().optional(),
  voiceChannelId: z.string().optional(),
});

export const SlackModeSchema = z.enum(['socket', 'rtm']);

export const SlackConfigSchema = z.object({
  botToken: z.string().min(1, "Slack bot token is required"),
  appToken: z.string().optional(),
  signingSecret: z.string().min(1, "Slack signing secret is required"),
  joinChannels: z.string().optional(),
  defaultChannelId: z.string().optional(),
  mode: SlackModeSchema.optional(),
});

export const MattermostConfigSchema = z.object({
  serverUrl: z.string().url("Invalid Mattermost server URL"),
  token: z.string().min(1, "Mattermost token is required"),
  channel: z.string().optional(),
});

// ============================================================================
// LLM Configurations
// ============================================================================

export const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API key is required"),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  systemPrompt: z.string().optional(),
});

export const FlowiseConfigSchema = z.object({
  apiKey: z.string().min(1, "Flowise API key is required"),
  apiBaseUrl: z.string().optional(),
});

export const OpenWebUIConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenWebUI API key is required"),
  apiUrl: z.string().optional(),
});

export const OpenSwarmConfigSchema = z.object({
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  team: z.string().optional(),
});

// ============================================================================
// Bot Configuration
// ============================================================================

export const MessageProviderSchema = z.enum(['discord', 'slack', 'mattermost', 'webhook']);
export const LlmProviderSchema = z.enum([
  'openai',
  'flowise',
  'openwebui',
  'perplexity',
  'replicate',
  'n8n',
  'openswarm'
]);

export const McpServerConfigSchema = z.object({
  name: z.string().min(1),
  serverUrl: z.string().url(),
  credentials: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const McpGuardTypeSchema = z.enum(['owner', 'custom']);

export const McpGuardConfigSchema = z.object({
  enabled: z.boolean(),
  type: McpGuardTypeSchema,
  allowedUsers: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const ContentFilterConfigSchema = z.object({
  enabled: z.boolean(),
  strictness: z.enum(['low', 'medium', 'high']).optional(),
  blockedTerms: z.array(z.string()).optional(),
});

export const BotConfigSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  messageProvider: MessageProviderSchema,
  llmProvider: LlmProviderSchema,
  llmProfile: z.string().optional(),
  responseProfile: z.string().optional(),
  mcpGuardProfile: z.string().optional(),
  mcpServerProfile: z.string().optional(),
  persona: z.string().optional(),
  systemInstruction: z.string().optional(),

  mcpServers: z.array(McpServerConfigSchema).optional(),
  mcpGuard: McpGuardConfigSchema.optional(),

  rateLimit: z.object({
    enabled: z.boolean(),
    maxRequests: z.number().positive().optional(),
    windowMs: z.number().positive().optional(),
  }).optional(),

  contentFilter: ContentFilterConfigSchema.optional(),

  // Optional provider configs
  discord: DiscordConfigSchema.optional(),
  slack: SlackConfigSchema.optional(),
  mattermost: MattermostConfigSchema.optional(),
  openai: OpenAIConfigSchema.optional(),
  flowise: FlowiseConfigSchema.optional(),
  openwebui: OpenWebUIConfigSchema.optional(),
  openswarm: OpenSwarmConfigSchema.optional(),
}).strict(); // Disallow unknown keys for stricter validation

export type BotConfigZod = z.infer<typeof BotConfigSchema>;
