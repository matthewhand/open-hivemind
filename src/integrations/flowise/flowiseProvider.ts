import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { getFlowiseResponse } from './flowiseRestClient';
import { getFlowiseSdkResponse } from './flowiseSdkClient';
import flowiseConfig from './flowiseConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  constructor() {
    debug('Initializing FlowiseProvider...');
    
    // Debug all Flowise configuration and environment variables
    const chatflowConversationId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    const chatflowCompletionId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    const useRest = flowiseConfig.get('FLOWISE_USE_REST');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
    const apiEndpoint = flowiseConfig.get('FLOWISE_API_ENDPOINT');

    debug(`Flowise Configuration:
      FLOWISE_CONVERSATION_CHATFLOW_ID: ${chatflowConversationId || 'NOT SET'},
      FLOWISE_COMPLETION_CHATFLOW_ID: ${chatflowCompletionId || 'NOT SET'},
      FLOWISE_USE_REST: ${useRest},
      FLOWISE_API_KEY: ${redactSensitiveInfo('apiKey', apiKey)},
      FLOWISE_API_ENDPOINT: ${apiEndpoint || 'NOT SET'}
    `);

    if (!chatflowConversationId || !chatflowCompletionId || !apiKey || !apiEndpoint) {
      debug('Missing critical Flowise configuration items.');
      throw new Error('Flowise configuration is incomplete.');
    } else {
      debug('FlowiseProvider initialized successfully with all required configuration.');
    }
  }

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
    debug('Starting chat completion with Flowise...');
    const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    const useRest = flowiseConfig.get('FLOWISE_USE_REST');

    const prompt = `${systemPrompt}\n${historyMessages.map(m => m.getText()).join(' ')}`;
    debug(`Generated Prompt: ${prompt}`);

    if (useRest) {
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
    debug('Starting completion generation with Flowise...');
    const chatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    const useRest = flowiseConfig.get('FLOWISE_USE_REST');

    const combinedPrompt = `${systemPrompt}\n${prompt}`;
    debug(`Generated Combined Prompt: ${combinedPrompt}`);

    if (useRest) {
      debug('Using REST client for completion');
      return await getFlowiseResponse('channelId', combinedPrompt);
    } else {
      debug('Using SDK client for completion');
      return await getFlowiseSdkResponse(combinedPrompt, chatflowId);
    }
  }
}

export const flowiseProvider = new FlowiseProvider();
