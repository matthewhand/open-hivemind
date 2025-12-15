import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { handleMessage } from '@message/handlers/messageHandler';
import { getMessengerProvider } from '@message/management/getMessengerProvider';
import { SyntheticMessage } from './SyntheticMessage';

const log = Debug('app:idleResponseManager');

interface ChannelActivity {
  lastInteractionTime: number;
  lastBotResponseTime: number;
  interactionCount: number;
  timer?: NodeJS.Timeout;
  lastMessageId?: string;
}

interface ServiceActivity {
  channels: Map<string, ChannelActivity>;
  lastInteractedChannelId: string | null;
  messengerService: IMessengerService;
  botConfig: any;
}

export class IdleResponseManager {
  private static instance: IdleResponseManager;
  private serviceActivities: Map<string, ServiceActivity> = new Map();
  private enabled: boolean = true;
  private minDelay: number = parseInt(process.env.IDLE_RESPONSE_MIN_DELAY || '60000', 10); // 60 seconds
  private maxDelay: number = parseInt(process.env.IDLE_RESPONSE_MAX_DELAY || '3600000', 10); // 60 minutes
  private idlePrompts: string[] = [
    "The conversation seems to have paused. Is there anything else you'd like to discuss or any questions I can help with?",
    "I notice it's been quiet for a bit. I'm here if you need assistance or want to continue our conversation.",
    "The channel has been idle. Would you like to explore any topics or need help with something?",
    "Taking a moment to check in - is there anything on your mind I can help with?",
    "It looks like we have a pause in the conversation. What would you like to talk about next?",
    "Silence falls... but I'm still here, ready to dive deeper into whatever thoughts are percolating.",
    "The digital winds have stilled. What currents of thought are stirring beneath the surface?",
    "A moment of quiet - perfect for reflection. What aspects of our discussion linger in your mind?",
    "The conversation breathes... shall we explore new territories or revisit uncharted depths?",
    "In this pause, I sense potential energy. What direction shall we channel it?"
  ];

  private constructor() {
    this.loadConfiguration();
  }

  public static getInstance(): IdleResponseManager {
    if (!IdleResponseManager.instance) {
      IdleResponseManager.instance = new IdleResponseManager();
    }
    return IdleResponseManager.instance;
  }

  private loadConfiguration(): void {
    try {
      // Check environment variables first for overrides
      const envMinDelay = process.env.IDLE_RESPONSE_MIN_DELAY;
      const envMaxDelay = process.env.IDLE_RESPONSE_MAX_DELAY;
      const envEnabled = process.env.IDLE_RESPONSE_ENABLED;

      const messageConfig = require('@config/messageConfig');
      const config = messageConfig.get('IDLE_RESPONSE') || {};

      this.enabled = envEnabled !== undefined ? envEnabled === 'true' : (config.enabled ?? true);

      // Use environment variables with fallback to config, then defaults
      const parseEnvInt = (value: string | undefined, fallback: number): number => {
        if (!value) return fallback;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? fallback : parsed;
      };

      this.minDelay = parseEnvInt(envMinDelay, config.minDelay ?? 60000);
      this.maxDelay = parseEnvInt(envMaxDelay, config.maxDelay ?? 3600000);

      // Ensure minDelay is not greater than maxDelay
      if (this.minDelay > this.maxDelay) {
        this.minDelay = this.maxDelay;
      }

      if (config.prompts && Array.isArray(config.prompts)) {
        this.idlePrompts = config.prompts;
      }

      log(`Idle response configured: enabled=${this.enabled}, minDelay=${this.minDelay}ms, maxDelay=${this.maxDelay}ms`);

      // Log if environment variables are being used
      if (envMinDelay || envMaxDelay || envEnabled) {
        log(`Environment variables used: IDLE_RESPONSE_MIN_DELAY=${envMinDelay}, IDLE_RESPONSE_MAX_DELAY=${envMaxDelay}, IDLE_RESPONSE_ENABLED=${envEnabled}`);
      }
    } catch (error) {
      log('Using default idle response configuration');
    }
  }

  public initialize(serviceNames?: string[]): void {
    if (!this.enabled) {
      log('Idle response manager is disabled');
      return;
    }

    const messengerServices = getMessengerProvider();

    // If serviceNames provided (for testing), use those instead of actual services
    if (serviceNames && serviceNames.length > 0) {
      for (const serviceName of serviceNames) {
        if (!this.serviceActivities.has(serviceName)) {
          // Create a mock service for testing
          const mockService: IMessengerService = {
            sendMessageToChannel: async () => 'mock-message-id',
            getMessagesFromChannel: async () => [],
            getClientId: () => 'test-client-id',
            initialize: async () => { },
            sendPublicAnnouncement: async () => { },
            getDefaultChannel: () => 'test-channel',
            shutdown: async () => { },
            setMessageHandler: () => { }
          };

          this.serviceActivities.set(serviceName, {
            channels: new Map(),
            lastInteractedChannelId: null,
            messengerService: mockService,
            botConfig: this.getBotConfig(serviceName)
          });

          log(`Initialized idle response tracking for service: ${serviceName}`);
        }
      }
    } else {
      // Use actual messenger services with unique identification
      for (const service of messengerServices) {
        let serviceName = (service as any).providerName || 'generic';

        // Handle Discord service with multiple bot instances
        if (serviceName === 'discord' && (service as any).getAllBots) {
          const discordService = service as any;
          const bots = discordService.getAllBots();

          // Create separate service entries for each Discord bot instance
          bots.forEach((bot: any, index: number) => {
            const botServiceName = `${serviceName}-${bot.botUserName || `bot${index + 1}`}`;

            if (!this.serviceActivities.has(botServiceName)) {
              // Create a wrapper that uses the specific bot instance
              const botWrapper: IMessengerService = {
                sendMessageToChannel: async (channelId: string, text: string, senderName?: string) => {
                  return await discordService.sendMessageToChannel(channelId, text, bot.botUserName || senderName);
                },
                getMessagesFromChannel: async (channelId: string) => {
                  return await discordService.getMessagesFromChannel(channelId);
                },
                getClientId: () => bot.botUserId || discordService.getClientId(),
                initialize: async () => { },
                sendPublicAnnouncement: async (channelId: string, announcement: string, threadId?: string) => {
                  return await discordService.sendPublicAnnouncement(channelId, announcement, threadId);
                },
                getDefaultChannel: () => discordService.getDefaultChannel(),
                shutdown: async () => { },
                setMessageHandler: (handler: any) => { }
              };

              this.serviceActivities.set(botServiceName, {
                channels: new Map(),
                lastInteractedChannelId: null,
                messengerService: botWrapper,
                botConfig: this.getBotConfig(serviceName)
              });

              log(`Initialized idle response tracking for Discord bot: ${botServiceName}`);
            }
          });
        } else {
          // Handle other services normally
          if (!this.serviceActivities.has(serviceName)) {
            this.serviceActivities.set(serviceName, {
              channels: new Map(),
              lastInteractedChannelId: null,
              messengerService: service,
              botConfig: this.getBotConfig(serviceName)
            });

            log(`Initialized idle response tracking for service: ${serviceName}`);
          }
        }
      }
    }
  }

  private getBotConfig(serviceName: string): any {
    try {
      const messageConfig = require('@config/messageConfig');
      return messageConfig.get(serviceName) || {};
    } catch {
      return {};
    }
  }

  public recordInteraction(serviceName: string, channelId: string, messageId?: string): void {
    if (!this.enabled) return;

    const serviceActivity = this.serviceActivities.get(serviceName);
    if (!serviceActivity) {
      log(`Service ${serviceName} not found for idle response tracking`);
      return;
    }

    const now = Date.now();

    if (!serviceActivity.channels.has(channelId)) {
      serviceActivity.channels.set(channelId, {
        lastInteractionTime: now,
        lastBotResponseTime: 0,
        interactionCount: 0,
        lastMessageId: messageId
      });
    }

    const activity = serviceActivity.channels.get(channelId)!;
    activity.lastInteractionTime = now;
    activity.interactionCount++;
    if (messageId) {
      activity.lastMessageId = messageId;
    }

    serviceActivity.lastInteractedChannelId = channelId;

    // Cancel any existing timer for this channel
    if (activity.timer) {
      clearTimeout(activity.timer);
      activity.timer = undefined;
    }

    // Only start timer if bot has been interacted with at least once (skip first message)
    if (activity.interactionCount > 1) {
      this.scheduleIdleResponse(serviceName, channelId);
    }

    log(`Recorded interaction in ${serviceName}:${channelId}, interaction count: ${activity.interactionCount}`);
  }

  public recordBotResponse(serviceName: string, channelId: string): void {
    const serviceActivity = this.serviceActivities.get(serviceName);
    if (serviceActivity) {
      const activity = serviceActivity.channels.get(channelId);
      if (activity) {
        activity.lastBotResponseTime = Date.now();
      }
    }
  }

  private scheduleIdleResponse(serviceName: string, channelId: string): void {
    const serviceActivity = this.serviceActivities.get(serviceName);
    if (!serviceActivity || !this.enabled) return;

    // Only schedule for the last interacted channel
    if (channelId !== serviceActivity.lastInteractedChannelId) {
      log(`Skipping idle response for ${serviceName}:${channelId} - not the last interacted channel`);
      return;
    }

    const activity = serviceActivity.channels.get(channelId);
    if (!activity) return;

    // Skip if this is the first interaction (interactionCount <= 1)
    if (activity.interactionCount <= 1) {
      log(`Skipping idle response for ${serviceName}:${channelId} - first interaction`);
      return;
    }

    // Clear any existing timer before scheduling a new one
    if (activity.timer) {
      clearTimeout(activity.timer);
      activity.timer = undefined;
    }

    const delay = this.getRandomDelay();
    log(`Scheduling idle response for ${serviceName}:${channelId} in ${delay}ms`);

    // Create a unique timer ID to prevent duplicates
    const timerId = Date.now() + Math.random();
    activity.timer = setTimeout(async () => {
      // Verify this is still the correct timer
      const currentActivity = serviceActivity.channels.get(channelId);
      if (currentActivity && currentActivity.timer === activity.timer) {
        // Clear the timer reference so triggerIdleResponse doesn't think it's a duplicate
        currentActivity.timer = undefined;
        await this.triggerIdleResponse(serviceName, channelId);
      }
    }, delay);
  }

  private getRandomDelay(): number {
    return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
  }

  private async triggerIdleResponse(serviceName: string, channelId: string): Promise<void> {
    try {
      const serviceActivity = this.serviceActivities.get(serviceName);
      if (!serviceActivity || !this.enabled) return;

      // Double-check conditions before triggering
      if (channelId !== serviceActivity.lastInteractedChannelId) {
        log(`Aborting idle response for ${serviceName}:${channelId} - not last interacted channel`);
        return;
      }

      const activity = serviceActivity.channels.get(channelId);
      if (!activity || activity.interactionCount <= 1) {
        log(`Aborting idle response for ${serviceName}:${channelId} - insufficient interactions`);
        return;
      }

      // Check if channel is still idle
      const now = Date.now();
      const timeSinceLastInteraction = now - activity.lastInteractionTime;
      const timeSinceLastBotResponse = now - activity.lastBotResponseTime;

      if (timeSinceLastInteraction < this.minDelay) {
        log(`Channel ${serviceName}:${channelId} not idle enough, rescheduling`);
        this.scheduleIdleResponse(serviceName, channelId);
        return;
      }

      // Prevent rapid consecutive idle responses
      if (timeSinceLastBotResponse < this.minDelay) {
        log(`Bot responded too recently to ${serviceName}:${channelId}, rescheduling`);
        this.scheduleIdleResponse(serviceName, channelId);
        return;
      }

      // Ensure we don't have an active timer already running
      if (activity.timer && activity.timer.hasRef && activity.timer.hasRef()) {
        log(`Timer already active for ${serviceName}:${channelId}, skipping duplicate trigger`);
        return;
      }

      log(`Triggering idle response for ${serviceName}:${channelId}`);

      // Try to get an older message from history to reference
      let idlePrompt: string;
      try {
        const history = await serviceActivity.messengerService.getMessagesFromChannel(channelId);
        const olderMessages = history.filter((msg: IMessage) => {
          // Exclude very recent messages and bot's own messages
          const msgTimestamp = msg.getTimestamp ? msg.getTimestamp() : null;
          const msgTime = typeof msgTimestamp === 'number' ? msgTimestamp : Date.now();
          const isOld = (now - msgTime) > 60000; // At least 1 minute old
          return isOld && !msg.isFromBot();
        });

        if (olderMessages.length > 0) {
          // Pick a random older message to reference
          const randomIndex = Math.floor(Math.random() * Math.min(olderMessages.length, 5));
          const oldMessage = olderMessages[randomIndex];
          const oldContent = oldMessage.getText().substring(0, 100);

          // Generate an LLM-based response referencing the old message
          const contextPrompt = `You're in a conversation that has gone quiet. Someone earlier said: "${oldContent}". 
Generate a short, natural follow-up question or comment to reignite the conversation. 
Be brief (under 50 words), curious, and conversational. Don't be robotic or say "I noticed" or "the conversation went quiet".`;

          try {
            const { getLlmProvider } = require('@src/llm/getLlmProvider');
            const providers = getLlmProvider();
            if (providers.length > 0) {
              const response = await providers[0].generateChatCompletion(contextPrompt, [], {});
              if (response && response.trim()) {
                idlePrompt = response.trim();
                log(`Generated LLM idle response referencing old message`);
              } else {
                idlePrompt = this.getRandomIdlePrompt();
              }
            } else {
              idlePrompt = this.getRandomIdlePrompt();
            }
          } catch (llmError) {
            log(`LLM failed for idle response, using fallback: ${llmError}`);
            idlePrompt = this.getRandomIdlePrompt();
          }
        } else {
          idlePrompt = this.getRandomIdlePrompt();
        }
      } catch (historyError) {
        log(`Could not fetch history for idle response: ${historyError}`);
        idlePrompt = this.getRandomIdlePrompt();
      }

      // Send the idle response directly without going through message processing
      const botName = serviceActivity.botConfig.MESSAGE_USERNAME_OVERRIDE || 'Assistant';
      await serviceActivity.messengerService.sendMessageToChannel(
        channelId,
        idlePrompt,
        botName
      );

      this.recordBotResponse(serviceName, channelId);
      log(`Sent idle response to ${serviceName}:${channelId}: "${idlePrompt.substring(0, 100)}..."`);

      // Don't immediately reschedule - wait for next interaction
      log(`Idle response completed for ${serviceName}:${channelId}, waiting for next interaction`);

    } catch (error) {
      log(`Error triggering idle response for ${serviceName}:${channelId}:`, error);
    }
  }

  private getRandomIdlePrompt(): string {
    return this.idlePrompts[Math.floor(Math.random() * this.idlePrompts.length)];
  }

  public configure(config: {
    enabled?: boolean;
    minDelay?: number;
    maxDelay?: number;
    prompts?: string[];
  }): void {
    this.enabled = config.enabled ?? this.enabled;
    this.minDelay = config.minDelay ?? this.minDelay;
    this.maxDelay = config.maxDelay ?? this.maxDelay;

    if (config.prompts && Array.isArray(config.prompts)) {
      this.idlePrompts = config.prompts;
    }

    log(`Reconfigured idle response: enabled=${this.enabled}, minDelay=${this.minDelay}ms, maxDelay=${this.maxDelay}ms`);
  }

  public clearChannel(serviceName: string, channelId: string): void {
    const serviceActivity = this.serviceActivities.get(serviceName);
    if (serviceActivity) {
      const activity = serviceActivity.channels.get(channelId);
      if (activity?.timer) {
        clearTimeout(activity.timer);
      }
      serviceActivity.channels.delete(channelId);

      if (serviceActivity.lastInteractedChannelId === channelId) {
        serviceActivity.lastInteractedChannelId = null;
      }
    }
  }

  public clearAllChannels(): void {
    for (const [serviceName, serviceActivity] of this.serviceActivities) {
      for (const [channelId, activity] of serviceActivity.channels) {
        if (activity.timer) {
          clearTimeout(activity.timer);
        }
      }
      serviceActivity.channels.clear();
      serviceActivity.lastInteractedChannelId = null;
    }
  }

  public getStats(): {
    totalServices: number;
    serviceDetails: Array<{
      serviceName: string;
      totalChannels: number;
      lastInteractedChannel: string | null;
      channelDetails: Array<{
        channelId: string;
        interactionCount: number;
        lastInteraction: Date;
        hasTimer: boolean;
      }>;
    }>;
  } {
    const serviceDetails = Array.from(this.serviceActivities.entries()).map(([serviceName, serviceActivity]) => ({
      serviceName,
      totalChannels: serviceActivity.channels.size,
      lastInteractedChannel: serviceActivity.lastInteractedChannelId,
      channelDetails: Array.from(serviceActivity.channels.entries()).map(([channelId, activity]) => ({
        channelId,
        interactionCount: activity.interactionCount,
        lastInteraction: new Date(activity.lastInteractionTime),
        hasTimer: !!activity.timer,
      })),
    }));

    return {
      totalServices: this.serviceActivities.size,
      serviceDetails,
    };
  }
}