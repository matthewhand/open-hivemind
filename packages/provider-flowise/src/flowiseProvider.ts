import Debug from 'debug';
import flowiseConfig from '@config/flowiseConfig';
import { getFlowiseResponse } from '@hivemind/provider-flowise/flowiseRestClient';
import { getFlowiseSdkResponse } from '@hivemind/provider-flowise/flowiseSdkClient';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';

const flowiseDebug = Debug('app:flowiseProvider');

export class FlowiseProvider implements ILlmProvider {
  name = 'flowise';
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
  }

  supportsCompletion(): boolean {
    return false;
  }

  supportsChatCompletion(): boolean {
    return true;
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
      flowiseDebug(`Sending request to Flowise for channel ${channelId}`);
      let response: string;

      const useRest =
        this.config.useRest !== undefined
          ? this.config.useRest
          : flowiseConfig.get('FLOWISE_USE_REST');

      if (useRest) {
        response = await getFlowiseResponse(channelId, userMessage);
      } else {
        const chatflowId =
          this.config.chatflowId || flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
        if (!chatflowId) {
          throw new Error('FLOWISE_CONVERSATION_CHATFLOW_ID is not set.');
        }
        response = await getFlowiseSdkResponse(userMessage, chatflowId);
      }
      return response;
    } catch (error) {
      flowiseDebug('Error getting response from Flowise:', error);
      return 'There was an error communicating with the AI service.';
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    flowiseDebug('generateCompletion is not supported, redirecting to generateChatCompletion.');
    return this.generateChatCompletion(prompt, [], { channelId: 'default-completion' });
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
