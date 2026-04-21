/**
 * DemoModeService - Manages demo/simulation mode
 *
 * When enabled, seeds a realistic demo configuration (bots, personas, guard profiles)
 * and runs an activity simulation that flows through the real MetricsCollector,
 * ActivityLogger, and WebSocketService pipelines so dashboards show live metrics.
 */

import 'reflect-metadata';
import crypto from 'crypto';
import Debug from 'debug';
import { inject, injectable, singleton } from 'tsyringe';
import { type BotConfigurationManager } from '../config/BotConfigurationManager';
import { type UserConfigStore } from '../config/UserConfigStore';
import { MetricsCollector } from '../monitoring/MetricsCollector';
import { ActivityLogger } from '../server/services/ActivityLogger';
import type {
  AlertEvent,
  MessageFlowEvent,
  PerformanceMetric,
} from '../server/services/websocket/types';
import { WebSocketService } from '../server/services/WebSocketService';

const debug = Debug('app:DemoModeService');

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
const DEMO_BOT_CONFIGS: Array<{
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
const DEMO_PERSONAS = [
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
const DEMO_GUARD_PROFILES = [
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
const DEMO_USERS = [
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
const MESSAGE_SCENARIOS = [
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
const CONVERSATION_THREADS = [
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

const ERROR_MESSAGES = [
  'Rate limit exceeded for LLM provider',
  'Connection timeout to message platform',
  'Invalid API key or expired token',
  'Message processing queue full',
  'Content filter blocked message',
  'Channel permissions insufficient',
];

@singleton()
@injectable()
export class DemoModeService {
  private isDemoMode = false;
  private demoBots: DemoBot[] = [];
  private conversations = new Map<string, DemoConversation>();
  private activeThreads = new Map<
    string,
    { threadIndex: number; stepIndex: number; lastActivity: number }
  >();
  private activitySimulator: DemoActivitySimulator = {
    isRunning: false,
    simulationStartTime: 0,
  };
  private simulationInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  // Real pipeline singletons (lazily accessed)
  private get metricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
  }
  private get activityLogger(): ActivityLogger {
    return ActivityLogger.getInstance();
  }
  private get wsService(): WebSocketService {
    return WebSocketService.getInstance();
  }

  // Helper for cryptographically secure random float between 0 and 1
  private randomFloat(): number {
    const randomBytes = crypto.randomBytes(4);
    return randomBytes.readUInt32BE() / 0x100000000;
  }

  // Helper for cryptographically secure random integer between min and max
  private randomInt(min: number, max: number): number {
    return Math.floor(this.randomFloat() * (max - min + 1)) + min;
  }

  constructor(
    @inject('BotConfigurationManager') private botManager: BotConfigurationManager,
    @inject('UserConfigStore') private configStore: UserConfigStore
  ) {
    debug('DemoModeService constructed');
  }

  /**
   * Check if demo mode should be activated.
   * Auto-detects when no bots have real credentials.
   */
  public detectDemoMode(): boolean {
    if (process.env.DEMO_MODE === 'true') return true;
    if (process.env.DEMO_MODE === 'false') return false;

    const bots = this.botManager.getAllBots();
    if (bots.length === 0) return true;

    const hasRealCredentials = bots.some((bot) => {
      if (bot.discord?.token && bot.discord.token.length > 10) return true;
      if (bot.slack?.botToken && bot.slack.botToken.length > 10) return true;
      if ((bot as any).mattermost?.accessToken && (bot as any).mattermost.accessToken.length > 10)
        return true;
      if (bot.openai?.apiKey && bot.openai.apiKey.length > 10) return true;
      if (bot.flowise?.apiKey && bot.flowise.apiKey.length > 10) return true;
      return false;
    });

    return !hasRealCredentials;
  }

  /**
   * Initialize demo mode — seed config and start simulation.
   */
  public async initialize(): Promise<void> {
    this.isDemoMode = this.detectDemoMode();
    if (this.isDemoMode) {
      await this.seedDemoConfig();
      this.startActivitySimulation();
      debug(
        'Demo mode initialized — seeded %d bots, %d personas, %d guard profiles',
        this.demoBots.length,
        DEMO_PERSONAS.length,
        DEMO_GUARD_PROFILES.length
      );
    }
  }

  public isInDemoMode(): boolean {
    return this.isDemoMode;
  }

  /**
   * Toggle demo mode at runtime.
   */
  public setDemoMode(enabled: boolean): void {
    this.isDemoMode = enabled;
    if (enabled) {
      this.seedDemoConfig()
        .then(() => {
          this.startActivitySimulation();
          debug('Demo mode enabled at runtime');
        })
        .catch((e) => debug('Failed to seed demo config: %s', e));
    } else {
      this.stopActivitySimulation();
      debug('Demo mode disabled at runtime (seeded config remains)');
    }
  }

  public getDemoBots(): DemoBot[] {
    return [...this.demoBots];
  }

  // ─── Demo Config Seeding ─────────────────────────────────────────

  /**
   * Seed demo bots, personas, and guard profiles into the real config stores.
   * Only seeds if none already exist (idempotent).
   */
  private async seedDemoConfig(): Promise<void> {
    const existingBots = this.botManager.getAllBots();
    if (existingBots.length === 0) {
      // Seed demo bots into BotConfigurationManager
      for (const cfg of DEMO_BOT_CONFIGS) {
        const botConfig: Record<string, unknown> = {
          name: cfg.name,
          messageProvider: cfg.messageProvider,
          llmProvider: cfg.llmProvider,
          persona: cfg.persona,
          systemInstruction: cfg.systemInstruction,
          isActive: true,
          config: {},
        };
        // Add demo provider placeholders (no real credentials)
        if (cfg.discord) {
          botConfig.discord = { ...cfg.discord, token: 'demo-token-placeholder' };
        }
        if (cfg.slack) {
          botConfig.slack = {
            ...cfg.slack,
            botToken: 'demo-token-placeholder',
            signingSecret: 'demo-secret',
          };
        }
        // Add demo LLM placeholders
        if (cfg.llmProvider === 'openai') {
          botConfig.openai = { apiKey: 'demo-key', model: 'gpt-4o-mini' };
        }
        if (cfg.llmProvider === 'flowise') {
          botConfig.flowise = { apiKey: 'demo-key', apiBaseUrl: 'https://demo.flowise.ai' };
        }
        if (cfg.llmProvider === 'openwebui') {
          botConfig.openwebui = { apiKey: 'demo-key', apiUrl: 'https://demo.openwebui.ai' };
        }
        if (cfg.llmProvider === 'perplexity') {
          botConfig.perplexity = { apiKey: 'demo-key', model: 'sonar' };
        }
        if (cfg.llmProvider === 'replicate') {
          botConfig.replicate = { apiKey: 'demo-key', model: 'meta/llama-3' };
        }

        try {
          await this.botManager.addBot(botConfig as any);
        } catch (e) {
          debug('Failed to seed demo bot %s: %s', cfg.name, e);
        }
        this.demoBots.push({
          id: cfg.name.toLowerCase().replace(/\s+/g, '-'),
          name: cfg.name,
          messageProvider: cfg.messageProvider as DemoBot['messageProvider'],
          llmProvider: cfg.llmProvider as DemoBot['llmProvider'],
          persona: cfg.persona,
          systemInstruction: cfg.systemInstruction,
          status: 'demo',
          connected: true,
          isDemo: true,
          discord: cfg.discord
            ? { channelId: cfg.discord.channelId, guildId: cfg.discord.guildId }
            : undefined,
          slack: cfg.slack
            ? { channelId: cfg.slack.channelId, teamId: cfg.slack.teamId }
            : undefined,
        });
      }
      debug('Seeded %d demo bots into BotConfigurationManager', this.demoBots.length);
    } else {
      // Track existing bots for activity simulation
      this.demoBots = existingBots.map((b) => ({
        id: (b as any).id || b.name,
        name: b.name,
        messageProvider: (b.messageProvider || 'discord') as DemoBot['messageProvider'],
        llmProvider: (b.llmProvider || 'openai') as DemoBot['llmProvider'],
        persona: (b as any).persona || 'default',
        systemInstruction: (b as any).systemInstruction || '',
        status: 'active' as const,
        connected: (b as any).isActive ?? true,
        isDemo: true,
        discord: (b as any).discord,
        slack: (b as any).slack,
      }));
      debug('Using %d existing bots for demo activity simulation', this.demoBots.length);
    }
  }

  // ─── Activity Simulation (through real pipelines) ─────────────────

  /**
   * Start activity simulation that flows through:
   *   MetricsCollector → ActivityLogger → WebSocketService
   * This makes dashboards show real, increasing metrics.
   */
  public startActivitySimulation(): void {
    if (!this.isDemoMode || this.activitySimulator.isRunning) return;
    if (this.demoBots.length === 0) return;

    this.activitySimulator.isRunning = true;
    this.activitySimulator.simulationStartTime = Date.now();
    debug('Starting demo activity simulation (real pipeline)');

    // Seed initial historical data
    this.seedHistoricalData();

    // Generate message flow events every 2-8 seconds
    const messageInterval = () => this.randomFloat() * 6000 + 2000;
    const tick = () => {
      this.generateAndRecordMessageEvent();
      this.simulationInterval = setTimeout(tick, messageInterval());
    };
    tick();

    // Generate performance metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.generateAndRecordPerformanceMetric();
    }, 5000);
  }

  public stopActivitySimulation(): void {
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.activitySimulator.isRunning = false;
    debug('Stopped demo activity simulation');
  }

  public getDemoStatus(): {
    isDemoMode: boolean;
    botCount: number;
    conversationCount: number;
    messageCount: number;
    isSimulationRunning: boolean;
    simulationStartTime: number;
  } {
    let messageCount = 0;
    this.conversations.forEach((conv) => {
      messageCount += conv.messages.length;
    });
    return {
      isDemoMode: this.isDemoMode,
      botCount: this.demoBots.length,
      conversationCount: this.conversations.size,
      messageCount,
      isSimulationRunning: this.activitySimulator.isRunning,
      simulationStartTime: this.activitySimulator.simulationStartTime,
    };
  }

  // Backwards-compat aliases for BroadcastService integration
  public getSimulatedMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.wsService.getMessageFlow(limit);
  }
  public getSimulatedAlerts(limit = 50): AlertEvent[] {
    return this.wsService.getAlerts(limit);
  }
  public getSimulatedPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.wsService.getPerformanceMetrics(limit);
  }

  public reset(): void {
    this.conversations.clear();
    this.stopActivitySimulation();
    this.demoBots = [];
  }

  // ─── Conversation Tracking (for /api/demo/chat) ────────────────────

  public getOrCreateConversation(channelId: string, botName: string): DemoConversation {
    const key = `${botName}:${channelId}`;
    if (!this.conversations.has(key)) {
      this.conversations.set(key, {
        id: `conv-${Date.now()}-${crypto.randomUUID()}`,
        channelId,
        botName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    return this.conversations.get(key)!;
  }

  public addMessage(
    channelId: string,
    botName: string,
    content: string,
    type: 'incoming' | 'outgoing',
    userId = 'demo-user',
    userName = 'Demo User'
  ): DemoMessage {
    const conversation = this.getOrCreateConversation(channelId, botName);
    const message: DemoMessage = {
      id: `msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      botName,
      channelId,
      userId,
      userName,
      content,
      type,
      isDemo: true,
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    return message;
  }

  public getConversationHistory(channelId: string, botName: string): DemoMessage[] {
    const key = `${botName}:${channelId}`;
    const conv = this.conversations.get(key);
    return conv ? [...conv.messages] : [];
  }

  public getAllConversations(): DemoConversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Generate a simulated AI response for demo chat.
   */
  public generateDemoResponse(message: string, _botName: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
      return "Hello! 👋 Welcome to Open-Hivemind! I'm a demo bot. How can I help you today?";
    }
    if (lowerMessage.includes('help')) {
      return 'Open-Hivemind offers multi-platform bots, multiple LLM providers, MCP integration, and personas. Configure API keys to unlock full functionality!';
    }
    const scenario = MESSAGE_SCENARIOS[this.randomInt(0, MESSAGE_SCENARIOS.length - 1)];
    return scenario.response;
  }

  // ─── Internal: Pipeline Integration ───────────────────────────────

  /**
   * Seed initial historical data so dashboards aren't empty on first load.
   */
  private seedHistoricalData(): void {
    const now = Date.now();

    // Pre-seed MetricsCollector with 60 data points
    for (let i = 60; i >= 0; i--) {
      const cpu = 15 + Math.sin(i * 0.1) * 10 + (this.randomFloat() - 0.5) * 8;
      const mem = 45 + Math.sin(i * 0.2) * 15 + (this.randomFloat() - 0.5) * 10;
      this.metricsCollector.recordMetric('demo.cpu', Math.max(5, Math.min(60, cpu)), {
        source: 'demo',
      });
      this.metricsCollector.recordMetric('demo.memory', Math.max(20, Math.min(85, mem)), {
        source: 'demo',
      });
      this.metricsCollector.recordResponseTime(100 + this.randomFloat() * 500);
      if (this.randomFloat() < 0.3) {
        this.metricsCollector.incrementMessages();
        this.metricsCollector.recordLlmTokenUsage(this.randomInt(50, 249));
      }
    }

    // Pre-seed ActivityLogger + WS with 30 events
    for (let i = 30; i >= 0; i--) {
      const event = this.createMessageFlowEventForWS(new Date(now - i * 10000).toISOString());
      try {
        this.activityLogger.log(event);
      } catch {
        // ActivityLogger may not be initialized in tests
      }
      this.wsService.recordMessageFlow(event);
    }

    // Pre-seed a couple of alerts
    for (let i = 2; i >= 0; i--) {
      const alert = this.createAlertEventForWS(new Date(now - i * 60000).toISOString());
      this.wsService.recordAlert(alert);
    }
  }

  /**
   * Generate a message event and push it through the real pipeline.
   * Uses conversation threads for more realistic multi-turn interactions.
   */
  private generateAndRecordMessageEvent(): void {
    const event = this.createMessageFlowEventForWS();

    // 1. Record in MetricsCollector
    this.metricsCollector.incrementMessages();
    if (event.processingTime) {
      this.metricsCollector.recordResponseTime(event.processingTime);
    }
    if (event.status === 'error') {
      this.metricsCollector.incrementErrors();
    }
    this.metricsCollector.recordLlmTokenUsage(this.randomInt(50, 349));

    // 2. Persist via ActivityLogger
    try {
      this.activityLogger.log(event);
    } catch {
      // May not be initialized in tests
    }

    // 3. Broadcast via WebSocket
    this.wsService.recordMessageFlow(event);
  }

  /**
   * Generate a performance metric and push through the real pipeline.
   */
  private generateAndRecordPerformanceMetric(): void {
    const metric = this.createPerformanceMetric();

    // Record in MetricsCollector
    this.metricsCollector.recordMetric('demo.cpu', metric.cpuUsage, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.memory', metric.memoryUsage, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.responseTime', metric.responseTime, {
      source: 'demo',
    });
    this.metricsCollector.recordMetric('demo.activeConnections', metric.activeConnections, {
      source: 'demo',
    });
    this.metricsCollector.recordMetric('demo.messageRate', metric.messageRate, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.errorRate', metric.errorRate, { source: 'demo' });

    // WebSocketService auto-broadcasts system metrics via startMetricsCollection every 5s,
    // so we don't need to manually broadcast.

    // Occasionally generate an alert
    if (this.randomFloat() < 0.1) {
      const alert = this.createAlertEventForWS();
      this.wsService.recordAlert(alert);
    }
  }

  // ─── Internal: Event Creation ─────────────────────────────────────

  /**
   * Generate realistic conversation thread content.
   */
  private generateThreadContent(): { content: string; isFromUser: boolean } {
    const now = Date.now();

    // 30% chance to start a new conversation thread
    if (this.randomFloat() < 0.3 || this.activeThreads.size === 0) {
      const threadIndex = this.randomInt(0, CONVERSATION_THREADS.length - 1);
      const channelKey = `thread-${Date.now()}`;
      this.activeThreads.set(channelKey, { threadIndex, stepIndex: 0, lastActivity: now });

      const thread = CONVERSATION_THREADS[threadIndex];
      return { content: thread[0].user, isFromUser: true };
    }

    // Continue existing thread
    const activeThreadKeys = Array.from(this.activeThreads.keys());
    const channelKey = activeThreadKeys[this.randomInt(0, activeThreadKeys.length - 1)];
    const threadState = this.activeThreads.get(channelKey)!;
    const thread = CONVERSATION_THREADS[threadState.threadIndex];

    // Clean up old threads (older than 5 minutes)
    if (now - threadState.lastActivity > 300000) {
      this.activeThreads.delete(channelKey);
      return this.generateThreadContent(); // Try again
    }

    const currentStep = thread[threadState.stepIndex];
    const isUserTurn = threadState.stepIndex % 2 === 0;

    // Update thread state
    threadState.stepIndex++;
    threadState.lastActivity = now;

    // End thread if we've reached the end
    if (threadState.stepIndex >= thread.length) {
      this.activeThreads.delete(channelKey);
    }

    return {
      content: isUserTurn ? currentStep.user : currentStep.bot,
      isFromUser: isUserTurn,
    };
  }

  /**
   * Create a message flow event WITH id/timestamp — for ActivityLogger.
   */
  private createMessageFlowEventForWS(_timestamp?: string): MessageFlowEvent {
    const bot = this.demoBots[this.randomInt(0, this.demoBots.length - 1)];
    const processingTime = this.generateProcessingTime();
    const hasError = this.randomFloat() < 0.05;
    const user = DEMO_USERS[this.randomInt(0, DEMO_USERS.length - 1)];

    // Use conversation threads for more realistic content
    const threadContent = this.generateThreadContent();
    const isIncoming = threadContent.isFromUser;
    const content = threadContent.content;

    return {
      id: `demo-msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      botName: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      channelId: bot.discord?.channelId || bot.slack?.channelId || `demo-channel-${bot.name}`,
      userId: user.id,
      messageType: isIncoming ? 'incoming' : 'outgoing',
      contentLength: content.length,
      processingTime: isIncoming ? undefined : processingTime,
      status: hasError ? 'error' : processingTime > 1500 ? 'timeout' : 'success',
      errorMessage: hasError
        ? ERROR_MESSAGES[this.randomInt(0, ERROR_MESSAGES.length - 1)]
        : undefined,
    };
  }

  /**
   * Create an alert event WITH id/timestamp — for WS recordAlert.
   */
  private createAlertEventForWS(
    _timestamp?: string
  ): Omit<AlertEvent, 'id' | 'timestamp' | 'status' | 'acknowledgedAt' | 'resolvedAt'> {
    const bot = this.demoBots[this.randomInt(0, this.demoBots.length - 1)];
    const levels: Array<'info' | 'warning' | 'error' | 'critical'> = [
      'info',
      'warning',
      'error',
      'critical',
    ];
    const level = levels[this.randomInt(0, levels.length - 1)];

    const titles: Record<string, string[]> = {
      info: ['Bot connected successfully', 'Configuration reloaded', 'Health check passed'],
      warning: ['High response time detected', 'Rate limit approaching', 'Memory usage elevated'],
      error: ['LLM provider connection failed', 'Message delivery timeout', 'Rate limit exceeded'],
      critical: [
        'Service unavailable',
        'Multiple bot failures detected',
        'System resource exhaustion',
      ],
    };

    return {
      level,
      title: titles[level][this.randomInt(0, titles[level].length - 1)],
      message: `Demo alert: ${bot.name} — ${titles[level][this.randomInt(0, titles[level].length - 1)]}`,
      botName: bot.name,
      channelId: bot.discord?.channelId || bot.slack?.channelId,
      metadata: { isDemo: true },
    };
  }

  private createPerformanceMetric(timestamp?: string): PerformanceMetric {
    const elapsed = Date.now() - (this.activitySimulator.simulationStartTime || Date.now());
    const cyclePosition = (elapsed / 60000) % 1;
    const hourOfDay = new Date().getHours();
    const todMultiplier = this.getTimeOfDayMultiplier(hourOfDay);
    const hasSpike = this.randomFloat() < 0.05;
    const spikeMul = hasSpike ? 1.5 + this.randomFloat() * 0.5 : 1;

    const cpu = (15 + Math.sin(cyclePosition * Math.PI * 2) * 10) * todMultiplier;
    const mem = (45 + Math.sin(cyclePosition * Math.PI * 4) * 15) * (0.8 + todMultiplier * 0.4);
    const msgRate = (2 + Math.sin(cyclePosition * Math.PI * 6) * 1.5) * todMultiplier;

    return {
      timestamp: timestamp || new Date().toISOString(),
      responseTime: this.randomFloat() * 500 + 100 + (hasSpike ? 200 : 0),
      memoryUsage: Math.max(20, Math.min(85, mem + (this.randomFloat() - 0.5) * 10)),
      cpuUsage: Math.max(5, Math.min(60, cpu * spikeMul + (this.randomFloat() - 0.5) * 8)),
      activeConnections: Math.floor(3 + msgRate + (this.randomFloat() - 0.5) * 2),
      messageRate: Math.max(0, msgRate * spikeMul + (this.randomFloat() - 0.5) * 0.5),
      errorRate: hasSpike ? this.randomFloat() * 0.1 : this.randomFloat() * 0.02,
    };
  }

  private generateProcessingTime(): number {
    const r = this.randomFloat();
    if (r < 0.6) return this.randomFloat() * 400 + 100; // 60% fast
    if (r < 0.9) return this.randomFloat() * 1000 + 500; // 30% medium
    return this.randomFloat() * 1500 + 1500; // 10% slow
  }

  private getTimeOfDayMultiplier(hour: number): number {
    // Business hours (9-17) = higher activity
    if (hour >= 9 && hour <= 17) return 1.2 + Math.sin(((hour - 9) / 8) * Math.PI) * 0.3;
    if (hour >= 7 && hour <= 20) return 0.8;
    return 0.3;
  }
}

export default DemoModeService;
