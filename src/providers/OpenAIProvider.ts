import { ILLMProvider } from '../types/IProvider';
import openaiConfig from '../config/openaiConfig';

export interface OpenAIConfig {
  OPENAI_API_KEY: string;
  OPENAI_TEMPERATURE: number;
  OPENAI_MAX_TOKENS: number;
  OPENAI_FREQUENCY_PENALTY: number;
  OPENAI_PRESENCE_PENALTY: number;
  OPENAI_BASE_URL: string;
  OPENAI_TIMEOUT: number;
  OPENAI_ORGANIZATION: string;
  OPENAI_MODEL: string;
  OPENAI_STOP: any[];
  OPENAI_TOP_P: number;
  OPENAI_SYSTEM_PROMPT: string;
  OPENAI_RESPONSE_MAX_TOKENS: number;
  OPENAI_MAX_RETRIES: number;
  OPENAI_FINISH_REASON_RETRY: string;
  OPENAI_VOICE: string;
}

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
    return openaiConfig as any;
  }

  getSensitiveKeys() {
    return ['OPENAI_API_KEY'];
  }
}
