import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';
import { getFlowiseSdkResponse } from './flowiseSdkClient';
import flowiseConfig from './flowiseConfig';
import { redactSensitiveInfo } from '@common/redactSensitiveInfo';

const debug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  constructor() {
    debug('Initializing FlowiseProvider...');

    const chatflowConversationId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');
    const chatflowCompletionId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');
    const apiKey = flowiseConfig.get('FLOWISE_API_KEY');
    const apiEndpoint = flowiseConfig.get('FLOWISE_API_ENDPOINT');

    debug(`Flowise Configuration:
      FLOWISE_CONVERSATION_CHATFLOW_ID: ${chatflowConversationId || 'NOT SET'},
      FLOWISE_COMPLETION_CHATFLOW_ID: ${chatflowCompletionId || 'NOT SET'},
      API_KEY: ${redactSensitiveInfo('apiKey', apiKey)},
      API_ENDPOINT: ${apiEndpoint || 'NOT SET'}
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
   * Generates a chat completion using the Flowise SDK.
   * @param historyMessages - Optional array of message history.
   * @param systemPrompt - Optional system prompt to prepend.
   * @returns The generated chat completion.
   */
  async generateChatCompletion(historyMessages: IMessage[] = [], systemPrompt: string = ''): Promise<string> {
    debug('Starting chat completion with Flowise...');
    const chatflowId = flowiseConfig.get('FLOWISE_CONVERSATION_CHATFLOW_ID');

    const prompt = `${systemPrompt}\n${historyMessages.map(m => m.getText()).join(' ')}`;
    debug(`Generated Prompt: ${prompt}`);

    debug('Using SDK client for chat completion');
    return await getFlowiseSdkResponse(prompt, chatflowId);
  }

  /**
   * Generates a completion using the Flowise SDK.
   * @param prompt - The input prompt.
   * @param systemPrompt - Optional system prompt to prepend.
   * @returns The generated completion.
   */
  async generateCompletion(prompt: string, systemPrompt: string = ''): Promise<string> {
    debug('Starting completion generation with Flowise...');
    const chatflowId = flowiseConfig.get('FLOWISE_COMPLETION_CHATFLOW_ID');

    const combinedPrompt = `${systemPrompt}\n${prompt}`;
    debug(`Generated Combined Prompt: ${combinedPrompt}`);

    debug('Using SDK client for completion');
    return await getFlowiseSdkResponse(combinedPrompt, chatflowId);
  }
}

export default new FlowiseProvider();
