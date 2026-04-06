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
      
      // Occasionally generate conversation threads (5% chance)
      if (Math.random() < 0.05 && this.demoBots.length > 0) {
        const bot = this.demoBots[Math.floor(Math.random() * this.demoBots.length)];
        const channelId = bot.discord?.channelId || bot.slack?.channelId || 'demo-channel';
        this.generateConversationThread(channelId, bot.name);
      }
    }, Math.random() * 6000 + 2000);

    // Generate performance metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.generatePerformanceMetric();
      this.maybeGenerateAlert();
    }, 5000);

    // Generate initial data
    this.generateInitialSimulationData();
    
    // Generate an initial conversation thread after 10 seconds
    if (this.demoBots.length > 0) {
      setTimeout(() => {
        const bot = this.demoBots[0];
        const channelId = bot.discord?.channelId || bot.slack?.channelId || 'demo-channel';
        this.generateConversationThread(channelId, bot.name);
      }, 10000);
    }
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
    const processingTime = this.generateRealisticProcessingTime();
    const hasError = Math.random() < 0.05; // 5% error rate
    
    const scenario = this.selectMessageScenario();
    const contentLength = scenario.content.length;

    return {
      id: `demo-msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: timestamp || new Date().toISOString(),
      botName: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      channelId: bot.discord?.channelId || bot.slack?.channelId || 'demo-channel',
      userId: scenario.userId,
      messageType: isIncoming ? 'incoming' : 'outgoing',
      contentLength,
      processingTime: isIncoming ? undefined : processingTime,
      status: hasError ? 'error' : (processingTime > 1500 ? 'timeout' : 'success'),
      errorMessage: hasError ? this.generateErrorMessage() : undefined,
    };
  }

  /**
   * Generate realistic processing times based on message complexity
   */
  private generateRealisticProcessingTime(): number {
    // Simulate different processing complexities
    const complexity = Math.random();
    if (complexity < 0.6) {
      // Simple responses: 100-500ms
      return Math.random() * 400 + 100;
    } else if (complexity < 0.9) {
      // Complex responses: 500-1500ms
      return Math.random() * 1000 + 500;
    } else {
      // Very complex responses: 1500-3000ms
      return Math.random() * 1500 + 1500;
    }
  }

  /**
   * Select a realistic message scenario
   */
  private selectMessageScenario(): { content: string; userId: string; userName: string } {
    const scenarios = [
      // Help and support scenarios
      {
        content: "Hello! I'm new to Open-Hivemind. Can you help me get started?",
        userId: 'user-001',
        userName: 'NewUser_Alice'
      },
      {
        content: "Thanks for the detailed explanation! That really helps me understand how the multi-agent system works.",
        userId: 'user-002', 
        userName: 'DevBob'
      },
      {
        content: "What's the difference between using OpenAI vs Flowise as the LLM provider?",
        userId: 'user-003',
        userName: 'TechEnthusiast'
      },
      // Configuration scenarios
      {
        content: "I'm having trouble connecting my Discord bot. The token seems correct but it's not responding.",
        userId: 'user-004',
        userName: 'DiscordAdmin'
      },
      {
        content: "How do I set up multiple bots to work in different Slack channels simultaneously?",
        userId: 'user-005',
        userName: 'SlackManager'
      },
      // Feature exploration
      {
        content: "The MCP integration looks interesting. Can you show me some examples of what tools I can connect?",
        userId: 'user-006',
        userName: 'IntegrationExplorer'
      },
      {
        content: "I love how the WebUI shows real-time activity! Is there a way to export these metrics?",
        userId: 'user-007',
        userName: 'DataAnalyst'
      },
      // Positive feedback
      {
        content: "This platform is exactly what I was looking for! The multi-platform support is fantastic.",
        userId: 'user-008',
        userName: 'HappyUser'
      },
      {
        content: "The demo mode is really well done - I can see the potential without having to configure everything first.",
        userId: 'user-009',
        userName: 'Evaluator'
      },
      // Technical questions
      {
        content: "What's the recommended setup for high-volume message processing? Any performance tips?",
        userId: 'user-010',
        userName: 'ScaleSeeker'
      },
      {
        content: "Can I use custom personas for different types of conversations? How granular can I get?",
        userId: 'user-011',
        userName: 'PersonaDesigner'
      },
      // Quick interactions
      {
        content: "Thanks!",
        userId: 'user-012',
        userName: 'QuickThanks'
      },
      {
        content: "That worked perfectly!",
        userId: 'user-013',
        userName: 'SuccessStory'
      }
    ];

    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  /**
   * Generate realistic error messages
   */
  private generateErrorMessage(): string {
    const errors = [
      'Rate limit exceeded for LLM provider',
      'Connection timeout to message platform',
      'Invalid API key or expired token',
      'Message processing queue full',
      'Temporary service unavailable',
      'Content filter blocked message',
      'Channel permissions insufficient',
      'Bot not found in specified channel'
    ];
    
    return errors[Math.floor(Math.random() * errors.length)];
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
    const hourOfDay = new Date().getHours();
    
    // Create time-of-day variations (higher activity during business hours)
    const timeOfDayMultiplier = this.getTimeOfDayMultiplier(hourOfDay);
    
    // Create realistic fluctuations with time-based patterns
    const cpuBase = (15 + Math.sin(cyclePosition * Math.PI * 2) * 10) * timeOfDayMultiplier;
    const memoryBase = (45 + Math.sin(cyclePosition * Math.PI * 4) * 15) * (0.8 + timeOfDayMultiplier * 0.4);
    const messageRateBase = (2 + Math.sin(cyclePosition * Math.PI * 6) * 1.5) * timeOfDayMultiplier;
    
    // Add some random spikes occasionally
    const hasSpike = Math.random() < 0.05; // 5% chance of spike
    const spikeMultiplier = hasSpike ? 1.5 + Math.random() * 0.5 : 1;
    
    return {
      timestamp: timestamp || new Date().toISOString(),
      responseTime: Math.random() * 500 + 100 + (hasSpike ? 200 : 0), // 100-600ms, +200ms for spikes
      memoryUsage: Math.max(20, Math.min(85, memoryBase + (Math.random() - 0.5) * 10)),
      cpuUsage: Math.max(5, Math.min(60, cpuBase * spikeMultiplier + (Math.random() - 0.5) * 8)),
      activeConnections: Math.floor(Math.random() * 8) + 1, // 1-8 connections
      messageRate: Math.max(0, messageRateBase * spikeMultiplier + (Math.random() - 0.5) * 1),
      errorRate: Math.random() * (hasSpike ? 8 : 3), // 0-3% normal, 0-8% during spikes
    };
  }

  /**
   * Get time-of-day multiplier for realistic activity patterns
   */
  private getTimeOfDayMultiplier(hour: number): number {
    // Simulate business hours activity (9 AM - 5 PM peak, lower at night)
    if (hour >= 9 && hour <= 17) {
      return 1.0 + Math.sin((hour - 9) / 8 * Math.PI) * 0.3; // Peak during business hours
    } else if (hour >= 18 && hour <= 22) {
      return 0.7 + Math.random() * 0.3; // Evening activity
    } else if (hour >= 6 && hour <= 8) {
      return 0.5 + Math.random() * 0.4; // Morning ramp-up
    } else {
      return 0.3 + Math.random() * 0.2; // Night time low activity
    }
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
   * Generate conversation threads for more realistic demo interactions
   */
  public generateConversationThread(channelId: string, botName: string): void {
    const conversationScenarios = [
      {
        title: 'Getting Started Help',
        messages: [
          { user: 'NewUser_Alice', content: "Hi! I'm new to Open-Hivemind. Can someone help me understand how to set up my first bot?" },
          { bot: true, content: "Welcome to Open-Hivemind! I'd be happy to help you get started. The easiest way is to begin with our WebUI configuration. What platform would you like to connect your bot to - Discord, Slack, or Mattermost?" },
          { user: 'NewUser_Alice', content: "I'd like to start with Discord. I have a bot token ready." },
          { bot: true, content: "Perfect! Here's what you need to do:\n\n1. Go to Configuration > Bots in the WebUI\n2. Click 'Create Bot'\n3. Enter your bot name and select Discord as the message provider\n4. Add your bot token in the Discord configuration section\n5. Choose an LLM provider (OpenAI, Flowise, etc.)\n\nWould you like me to walk you through any of these steps in detail?" },
          { user: 'NewUser_Alice', content: "That's really helpful! What LLM provider would you recommend for a beginner?" },
          { bot: true, content: "For beginners, I'd recommend starting with OpenAI - it's well-documented, reliable, and has great performance. You'll need an OpenAI API key, which you can get from platform.openai.com. Alternatively, if you want more control over your AI models, Flowise is excellent for creating custom AI workflows. What's your use case for the bot?" }
        ]
      },
      {
        title: 'Technical Discussion',
        messages: [
          { user: 'DevBob', content: "I'm impressed by the multi-agent orchestration. How does Open-Hivemind handle message routing between different bots?" },
          { bot: true, content: "Great question! Open-Hivemind uses a sophisticated routing system:\n\n• **Channel-based routing**: Each bot can be configured for specific channels\n• **Load balancing**: Messages can be distributed across multiple bots\n• **Context sharing**: Bots can share conversation context for seamless handoffs\n• **Priority systems**: Different bots can have different response priorities\n\nThe system ensures no message conflicts and maintains conversation coherence." },
          { user: 'DevBob', content: "That's fascinating! Can bots collaborate on complex tasks?" },
          { bot: true, content: "Absolutely! That's one of Open-Hivemind's key strengths. Bots can:\n\n🤝 **Collaborate**: Multiple bots can work on different aspects of a problem\n🔄 **Hand off**: Transfer conversations based on expertise\n📊 **Specialize**: Different bots for different domains (support, sales, technical)\n🧠 **Share memory**: Access shared conversation history and context\n\nFor example, a support bot might escalate to a technical bot, which then collaborates with a documentation bot to provide comprehensive answers." }
        ]
      },
      {
        title: 'Feature Exploration',
        messages: [
          { user: 'TechEnthusiast', content: "I see MCP integration mentioned. What kind of tools can I connect?" },
          { bot: true, content: "MCP (Model Context Protocol) integration opens up amazing possibilities! You can connect:\n\n🔧 **Development Tools**: GitHub, GitLab, Jira, CI/CD pipelines\n📊 **Analytics**: Google Analytics, database queries, reporting tools\n🌐 **APIs**: REST APIs, GraphQL endpoints, webhooks\n📁 **File Systems**: Local files, cloud storage, documentation\n🔍 **Search**: Elasticsearch, vector databases, knowledge bases\n\nEach tool extends your bot's capabilities beyond just conversation!" },
          { user: 'TechEnthusiast', content: "Can you give me a practical example?" },
          { bot: true, content: "Sure! Imagine a DevOps bot connected to:\n\n• **GitHub** - Can check PR status, create issues\n• **Monitoring tools** - Gets system metrics, alerts\n• **Deployment systems** - Triggers deployments, rollbacks\n• **Documentation** - Searches internal wikis, creates docs\n\nA user could ask: 'Deploy the latest version of user-service' and the bot would:\n1. Check GitHub for the latest release\n2. Verify system health via monitoring\n3. Trigger deployment\n4. Update documentation\n5. Report back with status\n\nAll through natural conversation!" }
        ]
      }
    ];

    const scenario = conversationScenarios[Math.floor(Math.random() * conversationScenarios.length)];
    const conversation = this.getOrCreateConversation(channelId, botName);
    
    // Add messages with realistic timing
    scenario.messages.forEach((msg, index) => {
      setTimeout(() => {
        if (msg.bot) {
          this.addMessage(channelId, botName, msg.content, 'outgoing', 'bot-system', botName);
        } else {
          this.addMessage(channelId, botName, msg.content, 'incoming', `user-${index}`, msg.user);
        }
      }, index * 2000); // 2 second delays between messages
    });
  }
  /**
   * Get recent activity summary for dashboard display
   */
  public getActivitySummary(): {
    recentMessages: number;
    activeUsers: number;
    averageResponseTime: number;
    systemHealth: 'excellent' | 'good' | 'fair' | 'poor';
    topChannels: Array<{ channelId: string; messageCount: number }>;
  } {
    const recentEvents = this.activitySimulator.messageFlowEvents.filter(
      event => new Date(event.timestamp) > new Date(Date.now() - 300000) // Last 5 minutes
    );
    
    const recentMetrics = this.activitySimulator.performanceMetrics.slice(-12); // Last minute
    const avgResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;
    
    const avgCpu = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / recentMetrics.length
      : 0;
    
    const avgMemory = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
      : 0;
    
    // Determine system health based on metrics
    let systemHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    if (avgCpu > 50 || avgMemory > 80 || avgResponseTime > 1000) {
      systemHealth = 'poor';
    } else if (avgCpu > 35 || avgMemory > 65 || avgResponseTime > 750) {
      systemHealth = 'fair';
    } else if (avgCpu > 20 || avgMemory > 50 || avgResponseTime > 500) {
      systemHealth = 'good';
    }
    
    // Count unique users
    const uniqueUsers = new Set(recentEvents.map(e => e.userId)).size;
    
    // Count messages by channel
    const channelCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      channelCounts.set(event.channelId, (channelCounts.get(event.channelId) || 0) + 1);
    });
    
    const topChannels = Array.from(channelCounts.entries())
      .map(([channelId, messageCount]) => ({ channelId, messageCount }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 5);
    
    return {
      recentMessages: recentEvents.length,
      activeUsers: uniqueUsers,
      averageResponseTime: Math.round(avgResponseTime),
      systemHealth,
      topChannels
    };
  }

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
