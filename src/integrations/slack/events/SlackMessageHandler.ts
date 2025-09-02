import Debug from 'debug';
import { IMessage } from '@message/interfaces/IMessage';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import messageConfig from '@config/messageConfig';
import { computeScore as channelComputeScore } from '@message/routing/ChannelRouter';
import SlackMessage from '../SlackMessage';
import { KnownBlock } from '@slack/web-api';

const debug = Debug('app:SlackService:MessageHandler');

export interface MessageProcessingContext {
  botName: string;
  botConfig: any;
  joinTs: number;
  lastSentEventTs: Map<string, string>;
  messageIO: any; // Will be defined by the main service
}

/**
 * Handles Slack message processing and LLM integration
 */
export class SlackMessageHandler {
  private context: MessageProcessingContext;

  constructor(context: MessageProcessingContext) {
    this.context = context;
  }

  /**
   * Process an incoming Slack message
   */
  public async processMessage(
    message: IMessage,
    historyMessages: IMessage[],
    enrichedMessage: SlackMessage,
    channelId: string,
    threadTs: string
  ): Promise<string> {
    const { botName, botConfig, joinTs, lastSentEventTs } = this.context;

    // Check if message is too old (bot joined after message was sent)
    const messageTs = parseFloat(enrichedMessage.data.event_ts || '0');
    if (messageTs < joinTs) {
      debug(`[${botName}] Ignoring old message: ts=${messageTs}, joinTs=${joinTs}`);
      return '';
    }

    // Check for duplicate events
    const eventTs = enrichedMessage.data.event_ts;
    const lastSent = lastSentEventTs.get(botName);
    if (lastSent === eventTs) {
      debug(`[${botName}] Duplicate event_ts detected: ${eventTs}, skipping`);
      return '';
    }

    // Basic message validation
    if (!enrichedMessage.getText()?.trim()) {
      debug(`[${botName}] Empty message text detected, skipping response`);
      return '';
    }

    // Process with LLM
    const response = await this.processWithLLM(
      enrichedMessage,
      historyMessages,
      botConfig,
      botName
    );

    if (response) {
      // Send response and update tracking
      const sentTs = await this.sendResponse(
        channelId,
        response.text,
        threadTs,
        response.blocks
      );

      if (sentTs) {
        lastSentEventTs.set(botName, eventTs);
        debug(`[${botName}] Response sent successfully, lastSentEventTs updated to: ${eventTs}`);
      }

      return response.text;
    }

    return '';
  }

  /**
   * Process message with LLM provider
   */
  private async processWithLLM(
    enrichedMessage: SlackMessage,
    historyMessages: IMessage[],
    botConfig: any,
    botName: string
  ): Promise<{ text: string; blocks?: KnownBlock[] } | null> {
    try {
      const userMessage = enrichedMessage.getText() || '';
      const formattedHistory: IMessage[] = historyMessages as unknown as IMessage[];

      let llmResponse: string;

      // Check for OpenWebUI configuration
      if (this.shouldUseOpenWebUI(botConfig)) {
        llmResponse = await this.callOpenWebUI(
          userMessage,
          formattedHistory,
          botConfig
        );
      } else {
        llmResponse = await this.callStandardLLM(
          userMessage,
          formattedHistory,
          botConfig
        );
      }

      debug(`[${botName}] LLM Response:`, llmResponse);

      // Process response with message processor
      const { text: fallbackText, blocks } = await this.processResponse(llmResponse);

      return { text: fallbackText, blocks };
    } catch (error) {
      debug(`[${botName}] Error processing message: ${error}`);
      return null;
    }
  }

  /**
   * Check if OpenWebUI should be used
   */
  private shouldUseOpenWebUI(botConfig: any): boolean {
    const cfg = botConfig;
    return !!(
      cfg?.llm &&
      (cfg.llm.provider || '').toLowerCase() === 'openwebui' &&
      (cfg.llm.apiUrl || cfg.llm.model)
    );
  }

  /**
   * Call OpenWebUI API
   */
  private async callOpenWebUI(
    userMessage: string,
    historyMessages: IMessage[],
    botConfig: any
  ): Promise<string> {
    const { generateChatCompletionDirect } = require('@integrations/openwebui/directClient');

    return await generateChatCompletionDirect(
      {
        apiUrl: botConfig.llm.apiUrl,
        authHeader: botConfig.llm.authHeader,
        model: botConfig.llm.model,
      },
      userMessage,
      historyMessages,
      (botConfig.llm.systemPrompt || '')
    );
  }

  /**
   * Call standard LLM provider
   */
  private async callStandardLLM(
    userMessage: string,
    historyMessages: IMessage[],
    botConfig: any
  ): Promise<string> {
    const llmProviders = getLlmProvider();
    if (!llmProviders.length) {
      debug('No LLM providers available');
      return 'Sorry, I\'m having trouble processing your request right now.';
    }

    try {
      return await llmProviders[0].generateChatCompletion(
        userMessage,
        historyMessages,
        botConfig
      );
    } catch (e) {
      debug(`LLM call failed, falling back: ${e}`);
      // Fallback to another provider if available
      if (llmProviders.length > 1) {
        return await llmProviders[1].generateChatCompletion(
          userMessage,
          historyMessages,
          botConfig
        );
      }
      throw e;
    }
  }

  /**
   * Process LLM response (placeholder - would delegate to message processor)
   */
  private async processResponse(llmResponse: string): Promise<{ text: string; blocks?: KnownBlock[] }> {
    // This would normally delegate to SlackMessageProcessor
    // For now, return the raw response
    return { text: llmResponse };
  }

  /**
   * Send response to Slack channel
   */
  private async sendResponse(
    channelId: string,
    text: string,
    threadId: string,
    blocks?: KnownBlock[]
  ): Promise<string> {
    return this.context.messageIO.sendMessageToChannel(
      channelId,
      text,
      this.context.botName,
      threadId,
      blocks
    );
  }

  /**
   * Calculate channel routing score
   */
  public scoreChannel(channelId: string, metadata?: Record<string, any>): number {
    try {
      const enabled = !!messageConfig.get('MESSAGE_CHANNEL_ROUTER_ENABLED');
      if (!enabled) {
        return 0;
      }
      return channelComputeScore(channelId, metadata);
    } catch (e) {
      debug('scoreChannel error, returning 0', e);
      return 0;
    }
  }
}