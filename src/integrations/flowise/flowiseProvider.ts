const axios = require('axios');
const flowiseConfig = require('@config/flowiseConfig');
const Debug = require('debug');

const flowiseDebug = Debug('app:flowiseProvider');

class FlowiseProvider {
  async generateCompletion(prompt: any) {
    const response = await axios.post(flowiseConfig.get('FLOWISE_API_URL'), { prompt });
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
