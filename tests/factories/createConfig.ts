import { BotConfig } from '../../src/types/config';

export function createConfig(overrides: Partial<BotConfig> = {}) {
  const base: BotConfig = {
    name: 'Default Bot',
    messageProvider: 'discord',
    llmProvider: 'flowise',
    llmProfile: 'default',
    responseProfile: 'default',
    mcpGuardProfile: 'default',
    mcpServerProfile: 'default',
    memoryProfile: 'default',
    persona: 'default',
    systemInstruction: '',
    mcpServers: [],
    mcpGuard: {
      enabled: false,
      type: 'custom',
      allowedTools: [],
      sensitiveTools: [],
      settings: {},
    },
    toolProfiles: [],
    rateLimit: { enabled: false },
    contentFilter: { enabled: false },
    enabled: true,
    discord: {
      token: 'DISCORD_TOKEN',
      clientId: 'CLIENT_ID',
      guildId: 'GUILD_ID',
      channelId: 'CHANNEL_ID',
      voiceChannelId: 'VOICE_CHANNEL_ID',
    },
    slack: {
      botToken: 'xoxb-token',
      appToken: 'xapp-token',
      signingSecret: 'signing-secret',
      joinChannels: '',
      defaultChannelId: '',
      mode: 'socket',
    },
    mattermost: {
      serverUrl: 'https://mattermost.example.com',
      token: 'token',
      channel: '',
    },
    openai: {
      apiKey: 'sk-key',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      systemPrompt: '',
    },
    flowise: {
      apiKey: 'flowise-key',
      apiBaseUrl: 'http://localhost:3000/api/v1',
    },
    openwebui: {
      apiKey: 'openwebui-key',
      apiUrl: 'http://localhost:3000/api/',
    },
    openswarm: {
      baseUrl: 'http://localhost:8000/v1',
      apiKey: 'openswarm-key',
      team: 'default-team',
    },
    letta: {
      agentId: '',
      systemPrompt: '',
      sessionMode: 'default',
      conversationId: '',
    },
    ...overrides,
  };

  return base;
}
