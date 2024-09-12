import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { getFlowiseResponse } from './flowiseRestClient';
import { getFlowiseSdkResponse } from './flowiseSdkClient';

const debug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  constructor() {}

  supportsChatCompletion() {
    return true;
  }

  supportsCompletion() {
    return true;
  }

  /**
   * Chooses between REST and SDK client based on config and generates a chat completion.
   */
  async generateChatCompletion(historyMessages: IMessage[] = [], systemPrompt: string = ''): Promise<string> {
    const chatflowId = process.env.FLOWISE_CONVERSATION_CHATFLOW_ID;
    if (!chatflowId) {
      throw new Error('FLOWISE_CONVERSATION_CHATFLOW_ID is not defined.');
    }
    const prompt = `${systemPrompt}\n${historyMessages.map(m => m.getText()).join(' ')}`;

    if (process.env.FLOWISE_USE_REST === 'true') {
      debug('Using REST client for chat completion');
      return await getFlowiseResponse('channelId', prompt);
    } else {
      debug('Using SDK client for chat completion');
      return await getFlowiseSdkResponse(prompt, chatflowId);
    }
  }

  /**
   * Chooses between REST and SDK client based on config and generates a completion.
   */
  async generateCompletion(prompt: string, systemPrompt: string = ''): Promise<string> {
    const chatflowId = process.env.FLOWISE_COMPLETION_CHATFLOW_ID;
    if (!chatflowId) {
      throw new Error('FLOWISE_COMPLETION_CHATFLOW_ID is not defined.');
    }
    const combinedPrompt = `${systemPrompt}\n${prompt}`;

    if (process.env.FLOWISE_USE_REST === 'true') {
      debug('Using REST client for completion');
      return await getFlowiseResponse('channelId', combinedPrompt);
    } else {
      debug('Using SDK client for completion');
      return await getFlowiseSdkResponse(combinedPrompt, chatflowId);
    }
  }
}

export const flowiseProvider = new FlowiseProvider();
