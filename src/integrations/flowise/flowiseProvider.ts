import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import flowiseConfig from '@integrations/flowise/interfaces/flowiseConfig';
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
    const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    const prompt = `${systemPrompt}\n${historyMessages.map(m => m.getText()).join(' ')}`;

    if (flowiseConfig.get('FLOWISE_USE_REST')) {
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
    const chatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    const combinedPrompt = `${systemPrompt}\n${prompt}`;

    if (flowiseConfig.get('FLOWISE_USE_REST')) {
      debug('Using REST client for completion');
      return await getFlowiseResponse('channelId', combinedPrompt);
    } else {
      debug('Using SDK client for completion');
      return await getFlowiseSdkResponse(combinedPrompt, chatflowId);
    }
  }
}

export const flowiseProvider = new FlowiseProvider();
