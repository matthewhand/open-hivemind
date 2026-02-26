import { ILLMProvider } from '../types/IProvider';
import openaiConfig, { OpenAIConfig } from '../config/openaiConfig';

export class OpenAIProvider implements ILLMProvider<OpenAIConfig> {
  id = 'openai';
  label = 'OpenAI';
  type = 'llm' as const;
  docsUrl = 'https://platform.openai.com/account/api-keys';
  helpText = 'Create an OpenAI API key from the developer dashboard and paste it here.';

  getSchema() {
    return openaiConfig.getSchema();
  }

  getConfig() {
    return openaiConfig;
  }

  getSensitiveKeys() {
    return ['OPENAI_API_KEY'];
  }
}
