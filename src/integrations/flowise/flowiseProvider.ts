import { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import { IMessage } from '@message/interfaces/IMessage';
import { getFlowiseResponse } from '@integrations/flowise/flowiseRestClient';
import Debug from 'debug';

const flowiseDebug = Debug('app:flowiseProvider');

class FlowiseProvider implements ILlmProvider {
  supportsCompletion(): boolean {
    return false; // This provider now focuses on chat completions.
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
      const response = await getFlowiseResponse(channelId, userMessage);
      return response;
    } catch (error) {
      flowiseDebug('Error getting response from Flowise:', error);
      return 'There was an error communicating with the AI service.';
    }
  }

  async generateCompletion(prompt: string): Promise<string> {
    flowiseDebug('generateCompletion is not supported, redirecting to generateChatCompletion.');
    // Fallback to chat completion with a dummy channelId if necessary,
    // though this path should ideally not be taken.
    return this.generateChatCompletion(prompt, [], { channelId: 'default-completion' });
  }
}

export default new FlowiseProvider();
