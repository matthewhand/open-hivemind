import flowiseConfig from './flowiseConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';
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

    if (!chatflowId || !baseUrl || !apiKey) {
      debug('Flowise configuration is incomplete.');
      throw new Error('Flowise configuration is missing required values.');
    }

    const prompt = `${systemPrompt}\n${historyMessages.map(m => m.getText()).join(' ')}`;
    debug(`Generated Prompt: ${prompt}`);

    if (useRest) {
      return getFlowiseResponse(prompt, chatflowId);
    } else {
      return getFlowiseSdkResponse(prompt, chatflowId);
    }
  }
}

export default FlowiseProvider;
