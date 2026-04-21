import openaiConfig, { type OpenAIConfig } from '../config/openaiConfig';
import { type ILLMProvider } from '../types/IProvider';

export class OpenAIProvider implements ILLMProvider<OpenAIConfig> {
  id = 'openai';
  label = 'OpenAI';
  type = 'llm' as const;
  docsUrl = 'https://platform.openai.com/account/api-keys';
  helpText = 'Create an OpenAI API key from the developer dashboard and paste it here.';

  getSchema(): Record<string, unknown> {
    return openaiConfig.getSchema() as unknown as Record<string, unknown>;
  }

  getConfig(): Record<string, unknown> {
    return openaiConfig as unknown as Record<string, unknown>;
  }

  getSensitiveKeys() {
    return ['OPENAI_API_KEY'];
  }
}
