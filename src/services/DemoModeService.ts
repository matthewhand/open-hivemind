import crypto from 'crypto';
/**
 * DemoModeService - Manages demo/simulation mode when no configuration is provided
 *
 * This service detects when the application is running without proper configuration
 * and provides a simulated environment for demonstration purposes.
 */

import 'reflect-metadata';
import Debug from 'debug';
import { inject, injectable, singleton } from 'tsyringe';
import { type BotConfigurationManager } from '../config/BotConfigurationManager';
import { type UserConfigStore } from '../config/UserConfigStore';
import { TOKENS } from '../di/container';
import type { MessageFlowEvent, PerformanceMetric, AlertEvent } from '../server/services/websocket/types';

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

export interface DemoActivitySimulator {
  isRunning: boolean;
  messageFlowEvents: MessageFlowEvent[];
  performanceMetrics: PerformanceMetric[];
  alertEvents: AlertEvent[];
  simulationStartTime: number;
}

/**
 * DemoModeService Singleton
 *
 * Detects and manages demo mode operation
 */
@singleton()
@injectable()
export class DemoModeService {
  private isDemoMode = false;
  private demoBots: DemoBot[] = [];
  private conversations = new Map<string, DemoConversation>();
  private activitySimulator: DemoActivitySimulator = {
    isRunning: false,
    messageFlowEvents: [],
    performanceMetrics: [],
    alertEvents: [],
    simulationStartTime: 0,
  };
  private simulationInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject(TOKENS.BotConfigurationManager) private botManager: BotConfigurationManager,
    @inject(TOKENS.UserConfigStore) private userConfigStore: UserConfigStore
  ) {
    debug('DemoModeService constructed');
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
    const bots = this.botManager.getAllBots();
    const warnings = this.botManager.getWarnings();

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
      this.startActivitySimulation();
      debug('Demo mode initialized with %d demo bots and activity simulation', this.demoBots.length);
    }
  }

  /**
   * Check if currently in demo mode
   */
  public isInDemoMode(): boolean {
    return this.isDemoMode;
  }

  /**
   * Toggle demo mode on or off at runtime (without restarting).
   * When enabling, creates demo bots. When disabling, clears them.
   */
  public setDemoMode(enabled: boolean): void {
    this.isDemoMode = enabled;
    if (enabled) {
      this.createDemoBots();
      this.startActivitySimulation();
      debug('Demo mode enabled at runtime with %d demo bots', this.demoBots.length);
    } else {
      this.demoBots = [];
      this.stopActivitySimulation();
      debug('Demo mode disabled at runtime');
    }
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
    if (message === null || message === undefined) {
      throw new Error('Message cannot be null or undefined');
    }
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
          '• Bot management across platforms\n' +
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

  /**
   * Add a message to a conversation
   */
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
    this.stopActivitySimulation();
    debug('Demo mode reset - conversations cleared');
  }

  /**
   * Start activity simulation for dashboards
   */
  public startActivitySimulation(): void {
    if (!this.isDemoMode || this.activitySimulator.isRunning) {
      return;
    }

    this.activitySimulator.isRunning = true;
    this.activitySimulator.simulationStartTime = Date.now();
    debug('Starting demo activity simulation');

    // Simulate message flow events every 2-8 seconds
    this.simulationInterval = setInterval(() => {
      this.generateMessageFlowEvent();
    }, Math.random() * 6000 + 2000);

    // Generate performance metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.generatePerformanceMetric();
      this.maybeGenerateAlert();
    }, 5000);

    // Generate initial data
    this.generateInitialSimulationData();
  }

  /**
   * Stop activity simulation
   */
  public stopActivitySimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.activitySimulator.isRunning = false;
    debug('Stopped demo activity simulation');
  }

  /**
   * Get simulated message flow events
   */
  public getSimulatedMessageFlow(limit = 100): MessageFlowEvent[] {
    return this.activitySimulator.messageFlowEvents.slice(-limit);
  }

  /**
   * Get simulated performance metrics
   */
  public getSimulatedPerformanceMetrics(limit = 60): PerformanceMetric[] {
    return this.activitySimulator.performanceMetrics.slice(-limit);
  }

  /**
   * Get simulated alerts
   */
  public getSimulatedAlerts(limit = 50): AlertEvent[] {
    return this.activitySimulator.alertEvents.slice(-limit);
  }

  /**
   * Generate initial simulation data for more interesting dashboards
   */
  private generateInitialSimulationData(): void {
    const now = Date.now();
    
    // Generate historical performance metrics (last 5 minutes)
    for (let i = 60; i >= 0; i--) {
      const timestamp = new Date(now - i * 5000).toISOString();
      this.activitySimulator.performanceMetrics.push(this.createPerformanceMetric(timestamp));
    }

    // Generate some historical message flow events
    for (let i = 20; i >= 0; i--) {
      const timestamp = new Date(now - i * 10000).toISOString();
      this.activitySimulator.messageFlowEvents.push(this.createMessageFlowEvent(timestamp));
    }

    // Generate a few sample alerts
    this.generateSampleAlerts();
  }

  /**
   * Generate a realistic message flow event
   */
  private generateMessageFlowEvent(): void {
    const event = this.createMessageFlowEvent();
    this.activitySimulator.messageFlowEvents.push(event);
    
    // Keep only last 100 events
    if (this.activitySimulator.messageFlowEvents.length > 100) {
      this.activitySimulator.messageFlowEvents = this.activitySimulator.messageFlowEvents.slice(-100);
    }
  }

  /**
   * Create a message flow event with realistic data
   */
  private createMessageFlowEvent(timestamp?: string): MessageFlowEvent {
    const bot = this.demoBots[Math.floor(Math.random() * this.demoBots.length)];
    const isIncoming = Math.random() > 0.4; // 60% outgoing, 40% incoming
    const processingTime = Math.random() * 2000 + 100; // 100-2100ms
    const hasError = Math.random() < 0.05; // 5% error rate
    
    const userNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const messageContents = [
      'Hello, how can I help you today?',
      'What are the latest updates?',
      'Can you explain how this works?',
      'Thanks for the information!',
      'I need help with configuration',
      'What features are available?',
      'How do I get started?',
      'This is really helpful!'
    ];

    return {
      id: `demo-msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: timestamp || new Date().toISOString(),
      botName: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      channelId: bot.discord?.channelId || bot.slack?.channelId || 'demo-channel',
      userId: `user-${Math.floor(Math.random() * 1000)}`,
      messageType: isIncoming ? 'incoming' : 'outgoing',
      contentLength: messageContents[Math.floor(Math.random() * messageContents.length)].length,
      processingTime: isIncoming ? undefined : processingTime,
      status: hasError ? 'error' : (processingTime > 1500 ? 'timeout' : 'success'),
      errorMessage: hasError ? 'Simulated processing error' : undefined,
    };
  }

  /**
   * Generate realistic performance metrics
   */
  private generatePerformanceMetric(): void {
    const metric = this.createPerformanceMetric();
    this.activitySimulator.performanceMetrics.push(metric);
    
    // Keep only last 60 metrics (5 minutes at 5-second intervals)
    if (this.activitySimulator.performanceMetrics.length > 60) {
      this.activitySimulator.performanceMetrics = this.activitySimulator.performanceMetrics.slice(-60);
    }
  }

  /**
   * Create a performance metric with realistic fluctuations
   */
  private createPerformanceMetric(timestamp?: string): PerformanceMetric {
    const baseTime = this.activitySimulator.simulationStartTime || Date.now();
    const elapsed = Date.now() - baseTime;
    const cyclePosition = (elapsed / 60000) % 1; // 1-minute cycle
    
    // Create realistic fluctuations
    const cpuBase = 15 + Math.sin(cyclePosition * Math.PI * 2) * 10; // 5-25% with sine wave
    const memoryBase = 45 + Math.sin(cyclePosition * Math.PI * 4) * 15; // 30-60% with faster cycle
    const messageRateBase = 2 + Math.sin(cyclePosition * Math.PI * 6) * 1.5; // 0.5-3.5 msgs/sec
    
    return {
      timestamp: timestamp || new Date().toISOString(),
      responseTime: Math.random() * 500 + 100, // 100-600ms
      memoryUsage: Math.max(20, Math.min(80, memoryBase + (Math.random() - 0.5) * 10)),
      cpuUsage: Math.max(5, Math.min(40, cpuBase + (Math.random() - 0.5) * 8)),
      activeConnections: Math.floor(Math.random() * 5) + 1, // 1-5 connections
      messageRate: Math.max(0, messageRateBase + (Math.random() - 0.5) * 1),
      errorRate: Math.random() * 3, // 0-3% error rate
    };
  }

  /**
   * Maybe generate an alert (10% chance per call)
   */
  private maybeGenerateAlert(): void {
    if (Math.random() < 0.1) { // 10% chance
      this.generateRandomAlert();
    }
  }

  /**
   * Generate sample alerts for initial data
   */
  private generateSampleAlerts(): void {
    const sampleAlerts = [
      {
        level: 'info' as const,
        title: 'Demo Mode Active',
        message: 'System is running in demonstration mode with simulated data',
      },
      {
        level: 'warning' as const,
        title: 'High Memory Usage',
        message: 'Memory usage has exceeded 70% for the past 2 minutes',
        botName: 'Demo Discord Bot',
      },
      {
        level: 'error' as const,
        title: 'Message Processing Error',
        message: 'Failed to process message due to simulated timeout',
        botName: 'Demo Slack Bot',
        channelId: 'C12345678',
      },
    ];

    sampleAlerts.forEach((alert, index) => {
      const timestamp = new Date(Date.now() - (sampleAlerts.length - index) * 30000).toISOString();
      this.activitySimulator.alertEvents.push({
        id: `demo-alert-${Date.now()}-${index}`,
        timestamp,
        status: index === 0 ? 'acknowledged' : 'active',
        acknowledgedAt: index === 0 ? timestamp : undefined,
        metadata: { source: 'demo-simulation' },
        ...alert,
      });
    });
  }

  /**
   * Generate a random alert
   */
  private generateRandomAlert(): void {
    const alertTypes = [
      {
        level: 'info' as const,
        title: 'Bot Status Update',
        message: 'Bot successfully reconnected to message provider',
      },
      {
        level: 'warning' as const,
        title: 'Rate Limit Approaching',
        message: 'API rate limit usage is at 80% for the current window',
      },
      {
        level: 'error' as const,
        title: 'Connection Timeout',
        message: 'Failed to establish connection within timeout period',
      },
      {
        level: 'warning' as const,
        title: 'High Response Time',
        message: 'Average response time has exceeded 2 seconds',
      },
    ];

    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const bot = this.demoBots[Math.floor(Math.random() * this.demoBots.length)];
    
    const alert: AlertEvent = {
      id: `demo-alert-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      status: 'active',
      botName: Math.random() > 0.3 ? bot.name : undefined,
      channelId: Math.random() > 0.5 ? (bot.discord?.channelId || bot.slack?.channelId) : undefined,
      metadata: { source: 'demo-simulation' },
      ...alertType,
    };

    this.activitySimulator.alertEvents.push(alert);
    
    // Keep only last 50 alerts
    if (this.activitySimulator.alertEvents.length > 50) {
      this.activitySimulator.alertEvents = this.activitySimulator.alertEvents.slice(-50);
    }
  }
}

export default DemoModeService;
