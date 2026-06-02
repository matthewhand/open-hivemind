import Debug from 'debug';
import flowiseConfig from '@config/flowiseConfig';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';
import { getFlowiseResponse } from './flowiseRestClient';
import { getFlowiseSdkResponse } from './flowiseSdkClient';

const flowiseDebug = Debug('app:flowiseProvider');

export class FlowiseProvider implements ILlmProvider {
  name = 'flowise';
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
  }

  supportsCompletion(): boolean {
    // Flowise exposes a single `/prediction/{chatflowId}` endpoint that accepts a
    // `question` and returns text. This serves single-turn completions as well as
    // chat, so non-chat completion is supported.
    return true;
  }

  supportsChatCompletion(): boolean {
    return true;
  }

  /**
   * Sends a single question to Flowise's prediction endpoint and returns the
   * text. Shared by both chat and completion paths. The `channelId` keys the
   * stateful chat session (REST mode) so independent conversations stay
   * isolated; completion uses a dedicated stateless channel id.
   */
  private async predict(channelId: string, question: string): Promise<string> {
    flowiseDebug(`Sending request to Flowise for channel ${channelId}`);

    const useRest =
      this.config.useRest !== undefined
        ? this.config.useRest
        : flowiseConfig.get('FLOWISE_USE_REST');

    if (useRest) {
      return getFlowiseResponse(channelId, question);
    }

    const chatflowId =
      this.config.chatflowId || flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    if (!chatflowId) {
      throw new Error('FLOWISE_CONVERSATION_CHATFLOW_ID is not set.');
    }
    return getFlowiseSdkResponse(question, chatflowId);
  }

  async generateChatCompletion(
    userMessage: string,
    historyMessages: IMessage[],
    metadata?: Record<string, any>
  ): Promise<string> {
    const channelId = metadata?.channelId;
    if (!channelId) {
      flowiseDebug('Error: channelId is missing from metadata for Flowise request.');
      return 'Sorry, I am missing some context to respond. Please try again.';
    }

    try {
      return await this.predict(channelId, userMessage);
    } catch (error) {
      flowiseDebug('Error getting response from Flowise:', error);
      return 'There was an error communicating with the AI service.';
    }
  }

  /**
   * Single-turn, stateless text completion. Flowise has no separate completion
   * endpoint, so this hits the same `/prediction/{chatflowId}` endpoint with a
   * dedicated channel id that is kept isolated from interactive chat sessions.
   */
  async generateCompletion(prompt: string): Promise<string> {
    flowiseDebug('generateCompletion: using stateless Flowise prediction.');
    try {
      return await this.predict('flowise-completion', prompt);
    } catch (error) {
      flowiseDebug('Error getting completion from Flowise:', error);
      return 'There was an error communicating with the AI service.';
    }
  }

  async validateCredentials(): Promise<boolean> {
    const useRest =
      this.config.useRest !== undefined
        ? this.config.useRest
        : flowiseConfig.get('FLOWISE_USE_REST');

    if (useRest) {
      return true;
    } else {
      const chatflowId =
        this.config.chatflowId || flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
      return !!chatflowId;
    }
  }

  async generateResponse(message: IMessage, context?: IMessage[]): Promise<string> {
    const metadata = message.metadata || {};
    if (!metadata.channelId) {
      metadata.channelId = message.getChannelId();
    }
    return this.generateChatCompletion(message.getText(), context || [], metadata);
  }
}

export default new FlowiseProvider();
