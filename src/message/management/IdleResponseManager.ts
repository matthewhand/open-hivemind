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
  private minDelay: number = 60000; // 60 seconds
  private maxDelay: number = 3600000; // 60 minutes
  private idlePrompts: string[] = [
    "The conversation seems to have paused. Is there anything else you'd like to discuss or any questions I can help with?",
    "I notice it's been quiet for a bit. I'm here if you need assistance or want to continue our conversation.",
    "The channel has been idle. Would you like to explore any topics or need help with something?",
    "Taking a moment to check in - is there anything on your mind I can help with?",
    "It looks like we have a pause in the conversation. What would you like to talk about next?"
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
      const messageConfig = require('@config/messageConfig');
      const config = messageConfig.get('IDLE_RESPONSE') || {};
      
      this.enabled = config.enabled ?? true;
      this.minDelay = config.minDelay ?? 60000;
      this.maxDelay = config.maxDelay ?? 3600000;
      
      if (config.prompts && Array.isArray(config.prompts)) {
        this.idlePrompts = config.prompts;
      }
      
      log(`Idle response configured: enabled=${this.enabled}, minDelay=${this.minDelay}ms, maxDelay=${this.maxDelay}ms`);
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
            initialize: async () => {},
            sendPublicAnnouncement: async () => {},
            getDefaultChannel: () => 'test-channel',
            shutdown: async () => {},
            setMessageHandler: () => {}
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
      // Use actual messenger services
      for (const service of messengerServices) {
        const serviceName = (service as any).providerName || 'generic';
        
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

    const delay = this.getRandomDelay();
    log(`Scheduling idle response for ${serviceName}:${channelId} in ${delay}ms`);

    activity.timer = setTimeout(async () => {
      await this.triggerIdleResponse(serviceName, channelId);
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

      log(`Triggering idle response for ${serviceName}:${channelId}`);
      
      // Get the most recent messages from the channel
      const messages = await serviceActivity.messengerService.getMessagesFromChannel(channelId);
      
      if (messages.length === 0) {
        log(`No messages found in ${serviceName}:${channelId}, skipping idle response`);
        return;
      }

      // Create a synthetic message that will trigger the LLM to generate a contextual response
      const syntheticMessage = this.createSyntheticMessage(messages[0]);
      
      // Process this through the normal message handler flow
      const response = await handleMessage(syntheticMessage, messages, serviceActivity.botConfig);
      
      if (response && response.trim()) {
        await serviceActivity.messengerService.sendMessageToChannel(
          channelId, 
          response, 
          serviceActivity.botConfig.MESSAGE_USERNAME_OVERRIDE || 'Assistant'
        );
        
        this.recordBotResponse(serviceName, channelId);
        log(`Sent idle response to ${serviceName}:${channelId}: "${response.substring(0, 100)}..."`);
      }
      
      // Schedule next idle response
      this.scheduleIdleResponse(serviceName, channelId);
      
    } catch (error) {
      log(`Error triggering idle response for ${serviceName}:${channelId}:`, error);
    }
  }

  private createSyntheticMessage(originalMessage: IMessage): IMessage {
    const prompt = this.idlePrompts[Math.floor(Math.random() * this.idlePrompts.length)];
    return new SyntheticMessage(originalMessage, prompt);
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