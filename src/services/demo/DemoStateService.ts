import 'reflect-metadata';
import Debug from 'debug';
import { inject, injectable, singleton } from 'tsyringe';
import { type BotConfigurationManager } from '../../config/BotConfigurationManager';
import { type UserConfigStore } from '../../config/UserConfigStore';
import { MetricsCollector } from '../../monitoring/MetricsCollector';
import { ActivityLogger } from '../../server/services/ActivityLogger';
import { WebSocketService } from '../../server/services/WebSocketService';
import { DemoActivitySimulatorService } from './DemoActivitySimulator';
import { DEMO_BOT_CONFIGS, type DemoBot } from './DemoConstants';
import { DemoConversationManager } from './DemoConversationManager';

const debug = Debug('app:DemoStateService');

/**
 * Manages the high-level demo mode state and initialization.
 */
@singleton()
@injectable()
export class DemoStateService {
  private isDemoMode = false;
  private demoBots: DemoBot[] = [];
  private conversationManager = new DemoConversationManager();
  private activitySimulator?: DemoActivitySimulatorService;

  constructor(
    @inject('BotConfigurationManager') private botManager: BotConfigurationManager,
    @inject('UserConfigStore') private configStore: UserConfigStore
  ) {}

  private get metricsCollector(): MetricsCollector {
    return MetricsCollector.getInstance();
  }

  private get activityLogger(): ActivityLogger {
    return ActivityLogger.getInstance();
  }

  private get wsService(): WebSocketService {
    return WebSocketService.getInstance();
  }

  public detectDemoMode(): boolean {
    const isDemo =
      process.env.DEMO_MODE === 'true' || (this.configStore as any).get?.('DEMO_MODE') === true;
    if (isDemo && !this.isDemoMode) {
      this.setDemoMode(true);
    }
    return isDemo;
  }

  public async initialize(): Promise<void> {
    if (this.detectDemoMode()) {
      debug('Demo Mode active, seeding configuration...');
      await this.seedDemoConfig();

      this.activitySimulator = new DemoActivitySimulatorService(
        this.demoBots,
        this.metricsCollector,
        this.activityLogger,
        this.wsService
      );

      this.activitySimulator.seedHistoricalData();
      this.activitySimulator.startActivitySimulation();
    }
  }

  public isInDemoMode(): boolean {
    return this.isDemoMode;
  }

  public setDemoMode(enabled: boolean): void {
    if (this.isDemoMode === enabled) {
      return;
    }
    this.isDemoMode = enabled;
    debug(`Demo mode ${enabled ? 'enabled' : 'disabled'}`);

    if (enabled) {
      this.initialize().catch((err) => debug('Failed to initialize demo mode:', err));
    } else {
      this.reset();
    }
  }

  public getDemoBots(): DemoBot[] {
    return this.demoBots;
  }

  public startActivitySimulation(): void {
    this.activitySimulator?.startActivitySimulation();
  }

  public stopActivitySimulation(): void {
    this.activitySimulator?.stopActivitySimulation();
  }

  public getDemoStatus(): any {
    return {
      enabled: this.isDemoMode,
      botCount: this.demoBots.length,
      simulator: this.activitySimulator?.getSimulatorState(),
      conversationCount: this.conversationManager.getAllConversations().length,
    };
  }

  public reset(): void {
    this.activitySimulator?.reset();
    this.conversationManager.reset();
    this.demoBots = [];
    debug('Demo mode reset');
  }

  private async seedDemoConfig(): Promise<void> {
    try {
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
          // Add demo provider placeholders
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
    } catch (error) {
      debug('Error seeding demo config:', error);
    }
  }

  // Delegation to ConversationManager
  public getConversationManager(): DemoConversationManager {
    return this.conversationManager;
  }
}
