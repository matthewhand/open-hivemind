import { EventEmitter } from 'events';
import { inject, singleton } from 'tsyringe';
import { Message } from '@src/types/messages';
import messageConfig from '@config/messageConfig';
import { getLlmProvider } from '@llm/getLlmProvider';
import type { IMessengerService } from '@message/interfaces/IMessengerService';
import Logger from '@common/logger';
import { GreetingStateManager } from './GreetingStateManager';

const appLogger = Logger.withContext('StartupGreetingService');

interface GreetingConfig {
  disabled: boolean;
  message: string;
  use_llm?: boolean;
}

class StartupGreetingService extends EventEmitter {
  private static instance: StartupGreetingService;
  private greetingStateManager: GreetingStateManager;

  private constructor() {
    super();
    appLogger.info('StartupGreetingService initialized');
    this.greetingStateManager = GreetingStateManager.getInstance();
    this.on('service-ready', this.handleServiceReady.bind(this));
  }

  public static getInstance(): StartupGreetingService {
    if (!StartupGreetingService.instance) {
      StartupGreetingService.instance = new StartupGreetingService();
    }
    return StartupGreetingService.instance;
  }

  public async initialize() {
    await this.greetingStateManager.initialize();
    appLogger.info('StartupGreetingService initialized');
  }

  /**
   * Strip surrounding quotes from a string if both leading and trailing quotes exist
   */
  private stripSurroundingQuotes(text: string): string {
    // Check if text starts and ends with the same quote character
    if (text.length >= 2) {
      const first = text[0];
      const last = text[text.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return text.slice(1, -1);
      }
    }
    return text;
  }

  /**
   * Generate a fun welcome message using LLM
   */
  private async generateLlmGreeting(): Promise<string> {
    try {
      const providers = await getLlmProvider();
      if (providers.length === 0) {
        appLogger.warn('No LLM providers available for greeting generation');
        return 'Hello! I am online and ready to assist.';
      }

      const provider = providers[0];
      const prompt = `Generate a short, friendly, and fun welcome message for a Discord channel. 
The message should be welcoming, slightly playful, and indicate that the bot is now online and ready to help. 
Keep it under 200 characters. You may use action words or emotes. 
IMPORTANT: Do not wrap any part of your response in quotation marks. Just output the plain message text directly.`;

      appLogger.info('Generating LLM greeting message...');

      if (provider.supportsChatCompletion()) {
        const response = await provider.generateChatCompletion(prompt, []);
        if (response) {
          appLogger.info('LLM greeting generated successfully');
          return this.stripSurroundingQuotes(response.trim());
        }
      } else if (provider.supportsCompletion()) {
        const response = await provider.generateCompletion(prompt);
        if (response) {
          appLogger.info('LLM greeting generated successfully');
          return this.stripSurroundingQuotes(response.trim());
        }
      }

      return 'Hello! I am online and ready to assist.';
    } catch (error) {
      appLogger.error('Failed to generate LLM greeting', { error });
      return 'Hello! I am online and ready to assist.';
    }
  }

  private async handleServiceReady(service: IMessengerService) {
    try {
      const serviceName = service.constructor.name || 'UnknownService';
      appLogger.info('Service ready event received', { provider: serviceName });

      const greetingConfig = messageConfig.get('greeting') as GreetingConfig;

      if (greetingConfig.disabled) {
        appLogger.info('Greeting message is disabled by configuration.');
        return;
      }

      const defaultChannel = service.getDefaultChannel();
      if (!defaultChannel) {
        appLogger.warn('No default channel configured for greeting message', {
          provider: serviceName,
        });
        return;
      }

      const serviceId = `${serviceName}-${defaultChannel}`;
      if (this.greetingStateManager.hasGreetingBeenSent(serviceId)) {
        appLogger.info('Greeting already sent for this service and channel', { serviceId });
        return;
      }

      // Determine the greeting message
      let greetingMessage: string;
      if (greetingConfig.use_llm) {
        appLogger.info('Using LLM to generate greeting message');
        greetingMessage = await this.generateLlmGreeting();
      } else {
        greetingMessage = greetingConfig.message || 'Hello! I am online.';
      }

      // Send the greeting
      appLogger.info('Sending greeting message', {
        provider: serviceName,
        channel: defaultChannel,
        message: greetingMessage,
      });
      await service.sendMessageToChannel(defaultChannel, greetingMessage);
      await this.greetingStateManager.markGreetingAsSent(serviceId, defaultChannel);
      appLogger.info('✅ Greeting message sent successfully', {
        provider: serviceName,
        channel: defaultChannel,
      });
    } catch (error) {
      const serviceName = service.constructor.name || 'UnknownService';
      const defaultChannel = service.getDefaultChannel() || 'unknown';
      appLogger.error('Failed to send greeting message', {
        provider: serviceName,
        channel: defaultChannel,
        error,
      });
    }
  }
}

export default StartupGreetingService.getInstance();
