import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { getFlowiseResponse } from './flowiseRestClient';
import { getFlowiseSdkResponse } from './flowiseSdkClient';
import flowiseConfig from './flowiseConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

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
    const useRest = flowiseConfig.get('FLOWISE_USE_REST');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
    const baseUrl = flowiseConfig.get('FLOWISE_BASE_URL');

    debug(`Flowise Configuration Loaded:
      Chatflow ID: ${chatflowId || 'MISSING'},
      Use REST: ${useRest},
      API Key: ${redactSensitiveInfo('apiKey', apiKey)},
      Base URL: ${baseUrl || 'MISSING'}
    `);
    debug(`History Messages: ${historyMessages.map(m => m.getText()).join(' ')}`);

    if (!chatflowId) {
      debug('FLOWISE_CONVERSATION_CHATFLOW_ID is missing.');
      throw new Error('FLOWISE_CONVERSATION_CHATFLOW_ID is not defined.');
    }

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
    const chatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    const useRest = flowiseConfig.get('FLOWISE_USE_REST');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
    const baseUrl = flowiseConfig.get('FLOWISE_BASE_URL');

    debug(`Flowise Configuration Loaded:
      Chatflow ID: ${chatflowId || 'MISSING'},
      Use REST: ${useRest},
      API Key: ${redactSensitiveInfo('apiKey', apiKey)},
      Base URL: ${baseUrl || 'MISSING'}
    `);
    debug(`System Prompt: ${systemPrompt}, Prompt: ${prompt}`);

    if (!chatflowId) {
      debug('FLOWISE_COMPLETION_CHATFLOW_ID is missing.');
      throw new Error('FLOWISE_COMPLETION_CHATFLOW_ID is not defined.');
    }

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
