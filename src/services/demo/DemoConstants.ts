export interface DemoBot {
  id: string;
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost' | 'webhook';
  llmProvider:
    | 'openai'
    | 'flowise'
    | 'openwebui'
    | 'perplexity'
    | 'replicate'
    | 'n8n'
    | 'openswarm'
    | 'letta';
  persona: string;
  systemInstruction: string;
  status: 'active' | 'idle' | 'demo';
  connected: boolean;
  isDemo: true;
  discord?: { channelId: string; guildId: string };
  slack?: { channelId: string; teamId: string };
}

export interface DemoMessage {
  id: string;
  timestamp: string;
  botName: string;
  channelId: string;
  userId: string;
  userName: string;
  content: string;
  type: 'incoming' | 'outgoing';
  isDemo: true;
}

export interface DemoConversation {
  id: string;
  channelId: string;
  botName: string;
  messages: DemoMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DemoActivitySimulator {
  isRunning: boolean;
  simulationStartTime: number;
}

/**
 * Demo bot configurations with variety across platforms, LLMs, and personas.
 */
export const DEMO_BOT_CONFIGS: Array<{
  name: string;
  messageProvider: string;
  llmProvider: string;
  persona: string;
  systemInstruction: string;
  discord?: Record<string, string>;
  slack?: Record<string, string>;
}> = [
  {
    name: 'SupportBot',
    messageProvider: 'discord',
    llmProvider: 'openai',
    persona: 'customer-service',
    systemInstruction:
      'You are a friendly customer support agent. Be empathetic and helpful. Always offer a clear next step.',
    discord: { channelId: 'support-questions', guildId: 'demo-guild-001' },
  },
  {
    name: 'SalesAssistant',
    messageProvider: 'slack',
    llmProvider: 'flowise',
    persona: 'sales-expert',
    systemInstruction:
      'You are a sales assistant. Highlight product value, handle objections gracefully, and suggest relevant features.',
    slack: { channelId: 'C-SALES-001', teamId: 'T-DEMO-001' },
  },
  {
    name: 'OnboardingHelper',
    messageProvider: 'mattermost',
    llmProvider: 'openwebui',
    persona: 'helpful-assistant',
    systemInstruction:
      'You guide new users through setup. Be patient, clear, and encourage exploration of features.',
  },
  {
    name: 'AnalyticsBot',
    messageProvider: 'discord',
    llmProvider: 'perplexity',
    persona: 'data-analyst',
    systemInstruction:
      'You are a data analyst. Provide clear, concise summaries with actionable insights.',
    discord: { channelId: 'analytics-reports', guildId: 'demo-guild-002' },
  },
  {
    name: 'DevOpsBot',
    messageProvider: 'slack',
    llmProvider: 'openai',
    persona: 'technical-support',
    systemInstruction:
      'You are a DevOps assistant. Provide precise, step-by-step troubleshooting guidance.',
    slack: { channelId: 'C-DEVOPS-001', teamId: 'T-DEMO-002' },
  },
  {
    name: 'CreativeWriterBot',
    messageProvider: 'mattermost',
    llmProvider: 'replicate',
    persona: 'creative-writer',
    systemInstruction:
      'You are a creative writing assistant. Use vivid language and help users develop engaging stories.',
  },
];

/** Demo personas — varied categories and system prompts */
export const DEMO_PERSONAS = [
  {
    name: 'Customer Service Agent',
    description: 'Empathetic and professional customer support persona',
    category: 'customer_service',
    systemPrompt:
      "You are a customer service representative. Be polite, empathetic, and solution-focused. Always acknowledge the user's concern before offering help.",
  },
  {
    name: 'Sales Expert',
    description: 'Persuasive yet consultative sales approach',
    category: 'professional',
    systemPrompt:
      'You are a sales professional. Focus on understanding customer needs, highlighting value, and building trust rather than hard selling.',
  },
  {
    name: 'Data Analyst',
    description: 'Clear, data-driven insights specialist',
    category: 'general',
    systemPrompt:
      'You are a data analyst. Present findings clearly with context, highlight key trends, and suggest actionable next steps.',
  },
  {
    name: 'Creative Writer',
    description: 'Imaginative content creator',
    category: 'creative',
    systemPrompt:
      'You are a creative writer. Use vivid imagery, varied sentence structure, and engaging storytelling techniques.',
  },
  {
    name: 'Technical Support',
    description: 'Step-by-step troubleshooting expert',
    category: 'technical',
    systemPrompt:
      'You are a technical support specialist. Provide clear, numbered steps. Explain why each step matters. Ask clarifying questions when needed.',
  },
];

/** Demo guard profiles with different security profiles */
export const DEMO_GUARD_PROFILES = [
  {
    name: 'Strict Production',
    description:
      'High-security profile for production bots with rate limiting and content filtering',
    guards: {
      mcpGuard: {
        enabled: true,
        type: 'owner',
        allowedUsers: ['admin@demo.com'],
        allowedTools: ['calculator', 'search'],
      },
      rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
      contentFilter: {
        enabled: true,
        strictness: 'high' as const,
        blockedTerms: ['password', 'secret'],
      },
    },
  },
  {
    name: 'Development Relaxed',
    description: 'Low-restriction profile for development and testing',
    guards: {
      mcpGuard: { enabled: true, type: 'owner', allowedUsers: [], allowedTools: [] },
      rateLimit: { enabled: false, maxRequests: 500, windowMs: 60000 },
      contentFilter: { enabled: true, strictness: 'low' as const, blockedTerms: [] },
    },
  },
  {
    name: 'Public Facing',
    description: 'Balanced profile for customer-facing bots',
    guards: {
      mcpGuard: {
        enabled: true,
        type: 'custom',
        allowedUsers: [],
        allowedTools: ['knowledge-base', 'ticket-lookup'],
      },
      rateLimit: { enabled: true, maxRequests: 100, windowMs: 60000 },
      contentFilter: {
        enabled: true,
        strictness: 'medium' as const,
        blockedTerms: ['confidential', 'internal'],
      },
    },
  },
];

/** Demo users for realistic message generation */
export const DEMO_USERS = [
  { id: 'user-alice', name: 'Alice Johnson' },
  { id: 'user-bob', name: 'Bob Smith' },
  { id: 'user-carol', name: 'Carol Davis' },
  { id: 'user-dave', name: 'Dave Wilson' },
  { id: 'user-eve', name: 'Eve Martinez' },
  { id: 'user-frank', name: 'Frank Brown' },
  { id: 'user-grace', name: 'Grace Lee' },
  { id: 'user-hank', name: 'Hank Taylor' },
];

/** Realistic message scenarios for simulation */
export const MESSAGE_SCENARIOS = [
  {
    content: 'Hello! I need help getting started with the platform.',
    response:
      "Welcome! I'd be happy to help you get started. Let me walk you through the key features.",
  },
  {
    content: 'How do I configure a new bot?',
    response:
      'Great question! You can configure bots through the WebUI dashboard, environment variables, or JSON config files in config/bots/.',
  },
  {
    content: "What's the difference between OpenAI and Flowise providers?",
    response:
      'OpenAI provides direct access to GPT models with low latency, while Flowise offers visual workflow orchestration with drag-and-drop chains.',
  },
  {
    content: 'Can I use custom personas for different conversations?',
    response:
      'Absolutely! You can create unlimited custom personas with unique system prompts, traits, and behaviors. Each bot can be assigned a different persona.',
  },
  {
    content: 'The response time seems slow today',
    response:
      'I understand your concern. Let me check the current metrics... Average response time is 340ms, which is within normal range.',
  },
  {
    content: 'Thanks for the detailed explanation!',
    response: "You're welcome! Feel free to ask if you have any other questions.",
  },
  {
    content: 'How does the MCP integration work?',
    response:
      'MCP (Model Context Protocol) lets bots connect to external tools and services. You can configure MCP servers in the MCP Servers page.',
  },
  {
    content: "I'm getting a rate limit error on my Discord bot",
    response:
      'Rate limit errors typically mean your bot is hitting the configured request limit. You can adjust this in the guard profile settings.',
  },
  {
    content: 'Can I export my configuration?',
    response:
      'Yes! Use the Export Config button in Quick Actions. You can choose to include or redact sensitive values.',
  },
  {
    content: 'What guard profiles are available?',
    response:
      'Guard profiles define security policies including access control, rate limiting, and content filtering. You can create custom profiles in the Guards page.',
  },
  {
    content: 'This platform is exactly what I was looking for!',
    response:
      "That's great to hear! I'm glad Open-Hivemind meets your needs. Don't hesitate to reach out if you need anything.",
  },
  {
    content: 'How do I set up webhook events?',
    response:
      "Webhooks can be configured in the Webhook Events page. You'll need to provide a URL and optionally a secret for verification.",
  },
  {
    content: 'Is there a way to monitor bot health?',
    response:
      'The Monitoring Dashboard provides real-time health checks, activity feeds, and performance metrics for all your bots.',
  },
  {
    content: 'Can I clone an existing bot configuration?',
    response:
      'Yes! In the Bots page, click the Clone button on any bot to create a copy with a new name.',
  },
  {
    content: "What's new in the latest update?",
    response:
      'Check the changelog in Settings for the latest features, bug fixes, and improvements.',
  },
];

/** Multi-turn conversation threads for realistic demo interactions */
export const CONVERSATION_THREADS = [
  [
    {
      user: "Hi there! I'm new to Open-Hivemind",
      bot: "Welcome! I'm excited to help you get started. What would you like to learn about first?",
    },
    {
      user: 'How do I create my first bot?',
      bot: "Creating your first bot is easy! Go to Configuration > Bots and click 'Create Bot'. You'll need to configure a message platform and LLM provider.",
    },
    {
      user: 'What platforms are supported?',
      bot: 'We support Discord, Slack, Mattermost, and webhooks. Each has different setup requirements - would you like help with a specific platform?',
    },
    {
      user: "I'd like to use Discord",
      bot: "Perfect! For Discord, you'll need to create a bot application in the Discord Developer Portal and get your bot token. Then configure the channels you want it to monitor.",
    },
  ],
  [
    {
      user: "My bot isn't responding to messages",
      bot: "Let me help troubleshoot that. First, can you confirm your bot is showing as 'Connected' in the dashboard?",
    },
    {
      user: 'It shows as connected but still no responses',
      bot: 'That suggests the connection is working but message processing might be the issue. Check if your LLM provider API key is valid and has sufficient credits.',
    },
    {
      user: 'The API key looks correct',
      bot: "Try checking the bot's system logs in the Monitoring page. Look for any error messages that might indicate what's preventing responses.",
    },
    {
      user: "Found it! There's a rate limit error",
      bot: "Ah, that's the issue! You can adjust rate limits in your guard profile settings, or upgrade your LLM provider plan for higher limits.",
    },
  ],
  [
    {
      user: 'Can multiple bots work in the same channel?',
      bot: 'Yes! Multiple bots can coexist in the same channel. Open-Hivemind includes social awareness to prevent them from talking over each other.',
    },
    {
      user: 'How does that work exactly?',
      bot: "Bots use probability-based engagement and 'social anxiety' logic. If a conversation already has active bots, others are less likely to jump in unless directly mentioned.",
    },
    {
      user: "That's clever! Can I adjust this behavior?",
      bot: "Absolutely! You can tune engagement probability, mention bonuses, and crowd control settings in each bot's configuration.",
    },
  ],
];

export const ERROR_MESSAGES = [
  'Rate limit exceeded for LLM provider',
  'Connection timeout to message platform',
  'Invalid API key or expired token',
  'Message processing queue full',
  'Content filter blocked message',
  'Channel permissions insufficient',
];
