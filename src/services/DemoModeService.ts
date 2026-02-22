/**
 * DemoModeService - Manages demo/simulation mode when no configuration is provided
 *
 * This service detects when the application is running without proper configuration
 * and provides a simulated environment for demonstration purposes.
 */

import Debug from 'debug';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
import { UserConfigStore } from '../config/UserConfigStore';

const debug = Debug('app:DemoModeService');

export interface DemoBot {
  id: string;
  name: string;
  messageProvider: 'discord' | 'slack' | 'mattermost';
  llmProvider: 'openai' | 'flowise' | 'openwebui';
  persona: string;
  systemInstruction: string;
  status: 'active' | 'idle' | 'demo';
  connected: boolean;
  isDemo: true;
  discord?: {
    channelId: string;
    guildId: string;
  };
  slack?: {
    channelId: string;
    teamId: string;
  };
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

/**
 * DemoModeService Singleton
 *
 * Detects and manages demo mode operation
 */
export class DemoModeService {
  private static instance: DemoModeService | null = null;
  private isDemoMode: boolean = false;
  private demoBots: DemoBot[] = [];
  private conversations: Map<string, DemoConversation> = new Map();
  private userConfigStore = UserConfigStore.getInstance();

  private constructor() {
    debug('DemoModeService constructed');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DemoModeService {
    if (!DemoModeService.instance) {
      DemoModeService.instance = new DemoModeService();
    }
    return DemoModeService.instance;
  }

  /**
   * Check if demo mode should be activated
   * Demo mode is activated when:
   * - No bots are configured via environment or config files
   * - No API keys are provided for LLM providers
   * - No messenger tokens are provided
   */
  public detectDemoMode(): boolean {
    // Check if explicitly enabled via environment
    if (process.env.DEMO_MODE === 'true') {
      debug('Demo mode explicitly enabled via DEMO_MODE=true');
      return true;
    }

    // Check if explicitly disabled
    if (process.env.DEMO_MODE === 'false') {
      debug('Demo mode explicitly disabled via DEMO_MODE=false');
      return false;
    }

    // Check for existing bot configuration
    const botManager = BotConfigurationManager.getInstance();
    const bots = botManager.getAllBots();
    const warnings = botManager.getWarnings();

    // If there are bots configured, not in demo mode
    if (bots.length > 0) {
      // But check if any have actual credentials
      const hasRealCredentials = bots.some((bot) => {
        // Check for Discord token
        if (bot.discord?.token && bot.discord.token.length > 10) {
          return true;
        }
        // Check for Slack token
        if (bot.slack?.botToken && bot.slack.botToken.length > 10) {
          return true;
        }
        // Check for Mattermost token
        if ((bot as any).mattermost?.token && (bot as any).mattermost.token.length > 10) {
          return true;
        }
        // Check for OpenAI key
        if (bot.openai?.apiKey && bot.openai.apiKey.length > 10) {
          return true;
        }
        // Check for Flowise key
        if (bot.flowise?.apiKey && bot.flowise.apiKey.length > 10) {
          return true;
        }
        return false;
      });

      if (hasRealCredentials) {
        debug('Real credentials found, demo mode disabled');
        return false;
      }
    }

    // Check for warning about no configuration
    const hasNoConfigWarning = warnings.some(
      (w) =>
        w.toLowerCase().includes('no bot configuration') ||
        w.toLowerCase().includes('no configuration')
    );

    // Check for critical environment variables
    const hasDiscordToken =
      process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN.length > 10;
    const hasSlackToken = process.env.SLACK_BOT_TOKEN && process.env.SLACK_BOT_TOKEN.length > 10;
    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10;
    const hasFlowiseKey = process.env.FLOWISE_API_KEY && process.env.FLOWISE_API_KEY.length > 10;

    // If no critical credentials are found and no bots configured, enable demo mode
    if (!hasDiscordToken && !hasSlackToken && !hasOpenAIKey && !hasFlowiseKey) {
      if (bots.length === 0 || hasNoConfigWarning) {
        debug('No credentials or configuration found, enabling demo mode');
        return true;
      }
    }

    return false;
  }

  /**
   * Initialize demo mode
   */
  public initialize(): void {
    this.isDemoMode = this.detectDemoMode();

    if (this.isDemoMode) {
      this.createDemoBots();
      debug('Demo mode initialized with %d demo bots', this.demoBots.length);
    }
  }

  /**
   * Check if currently in demo mode
   */
  public isInDemoMode(): boolean {
    return this.isDemoMode;
  }

  /**
   * Get demo bots
   */
  public getDemoBots(): DemoBot[] {
    return [...this.demoBots];
  }

  /**
   * Create demo bot configurations
   */
  private createDemoBots(): void {
    this.demoBots = [
      {
        id: 'demo-discord-bot',
        name: 'Demo Discord Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        persona: 'helpful-assistant',
        systemInstruction:
          'You are a helpful AI assistant demonstrating the Open-Hivemind platform. Be friendly and informative.',
        status: 'demo',
        connected: true,
        isDemo: true,
        discord: {
          channelId: 'demo-channel-123',
          guildId: 'demo-guild-456',
        },
      },
      {
        id: 'demo-slack-bot',
        name: 'Demo Slack Bot',
        messageProvider: 'slack',
        llmProvider: 'flowise',
        persona: 'friendly-helper',
        systemInstruction:
          'You are a friendly assistant helping users understand Open-Hivemind capabilities.',
        status: 'demo',
        connected: true,
        isDemo: true,
        slack: {
          channelId: 'C12345678',
          teamId: 'T12345678',
        },
      },
    ];
  }

  /**
   * Generate a simulated AI response
   */
  public generateDemoResponse(message: string, botName: string): string {
    const responses = this.getContextualResponses(message, botName);
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  /**
   * Get contextual responses based on message content
   */
  private getContextualResponses(message: string, _botName: string): string[] {
    const lowerMessage = message.toLowerCase();

    // Greeting responses
    if (lowerMessage.match(/^(hi|hello|hey|greetings)/)) {
      return [
        "Hello! 👋 Welcome to Open-Hivemind! I'm a demo bot showing you what's possible. How can I help you today?",
        "Hey there! Great to meet you! I'm running in demo mode to show off the platform's capabilities.",
        "Hi! I'm a demonstration bot. In production, I'd be connected to real AI services to help you!",
      ];
    }

    // Help responses
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return [
        "I can help you explore Open-Hivemind! Here's what the platform offers:\n\n" +
          '🤖 **Multi-Platform Bots** - Discord, Slack, Mattermost\n' +
          '🧠 **Multiple LLM Providers** - OpenAI, Flowise, OpenWebUI, and more\n' +
          '🔌 **MCP Integration** - Connect to external tools and services\n' +
          '👥 **Personas** - Customize bot personalities\n\n' +
          'Configure your API keys to unlock full functionality!',
        'Open-Hivemind is a powerful multi-agent orchestration framework! Key features:\n\n' +
          '• Unified bot management across platforms\n' +
          '• Flexible LLM provider switching\n' +
          '• Real-time WebUI dashboard\n' +
          '• MCP tool integration\n\n' +
          'Add your credentials to start using real AI services!',
      ];
    }

    // Configuration questions
    if (
      lowerMessage.includes('config') ||
      lowerMessage.includes('setup') ||
      lowerMessage.includes('start')
    ) {
      return [
        'To configure Open-Hivemind, you can:\n\n' +
          '1. **Environment Variables** - Set `DISCORD_BOT_TOKEN`, `OPENAI_API_KEY`, etc.\n' +
          '2. **Config Files** - Create files in `config/bots/` directory\n' +
          '3. **WebUI** - Use the dashboard at `/` to manage bots\n\n' +
          'Check the `.env.example` file for all available options!',
        'Getting started is easy! You can configure bots via:\n\n' +
          '• Environment variables (BOTS_botname_* pattern)\n' +
          '• JSON config files in config/bots/\n' +
          '• The WebUI configuration panel\n\n' +
          'Would you like me to explain any specific configuration option?',
      ];
    }

    // Feature questions
    if (lowerMessage.includes('feature') || lowerMessage.includes('capabil')) {
      return [
        "Open-Hivemind's key capabilities:\n\n" +
          '🌐 **Multi-Messenger Support** - Discord, Slack, Mattermost\n' +
          '🤖 **Multi-Bot Management** - Run multiple bots from one instance\n' +
          '🔄 **Hot Reload** - Update configs without restart\n' +
          '📊 **Activity Dashboard** - Monitor bot performance\n' +
          '🔐 **Secure Config** - Encrypted credential storage\n' +
          '🛠️ **MCP Tools** - Extend with external tools\n\n' +
          'Explore the WebUI to see more!',
      ];
    }

    // Default conversational responses
    return [
      "That's an interesting point! In production mode, I'd connect to a real LLM to give you a thoughtful response. For now, I'm demonstrating the platform's messaging capabilities.",
      "Great question! When you configure an LLM provider (like OpenAI or Flowise), I'll be able to provide intelligent responses. This demo shows the message flow works perfectly!",
      "I'm running in demo mode with simulated responses. Add your API keys to unlock real AI-powered conversations!",
      "The Open-Hivemind platform is designed to handle messages just like this. With proper configuration, you'd get AI-generated responses tailored to your use case.",
      'Thanks for testing the demo! This shows how messages flow through the system. Configure your credentials to enable real AI responses.',
    ];
  }

  /**
   * Create or get a conversation
   */
  public getOrCreateConversation(channelId: string, botName: string): DemoConversation {
    const key = `${botName}:${channelId}`;

    if (!this.conversations.has(key)) {
      this.conversations.set(key, {
        id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        botName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return this.conversations.get(key)!;
  }

  /**
   * Add a message to a conversation
   */
  public addMessage(
    channelId: string,
    botName: string,
    content: string,
    type: 'incoming' | 'outgoing',
    userId: string = 'demo-user',
    userName: string = 'Demo User'
  ): DemoMessage {
    const conversation = this.getOrCreateConversation(channelId, botName);

    const message: DemoMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  /**
   * Get conversation history
   */
  public getConversationHistory(channelId: string, botName: string): DemoMessage[] {
    const key = `${botName}:${channelId}`;
    const conversation = this.conversations.get(key);
    return conversation ? [...conversation.messages] : [];
  }

  /**
   * Get all conversations
   */
  public getAllConversations(): DemoConversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Get demo mode status info
   */
  public getDemoStatus(): {
    isDemoMode: boolean;
    botCount: number;
    conversationCount: number;
    messageCount: number;
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
    };
  }

  /**
   * Reset demo mode (clear conversations)
   */
  public reset(): void {
    this.conversations.clear();
    debug('Demo mode reset - conversations cleared');
  }
}

export default DemoModeService;
