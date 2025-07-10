import axios from 'axios';
import flowiseConfig from '@config/flowiseConfig';
import Debug from 'debug';

const flowiseDebug = Debug('app:flowiseProvider');

class FlowiseProvider {
  async generateCompletion(prompt: any) {
    const apiUrl = flowiseConfig.get('FLOWISE_API_ENDPOINT'); // Corrected usage
    const response = await axios.post(apiUrl, { prompt });
    flowiseDebug(`Generated completion for prompt: ${prompt}`);
    return response.data.completion;
  }

  supportsCompletion() {
    return true;
  }

  supportsChatCompletion() {
    return false;
  }

  async generateChatCompletion(messages: any): Promise<string> {
    flowiseDebug('Chat completion not supported, returning empty string');
    return '';
  }
}

export default new FlowiseProvider();
