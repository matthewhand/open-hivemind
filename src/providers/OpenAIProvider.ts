import openaiConfig from '../config/openaiConfig';
import { ILLMProvider } from '../types/IProvider';

export class OpenAIProvider implements ILLMProvider {
  public readonly id = 'openai';
  public readonly label = 'OpenAI';
  public readonly type = 'llm';
  public readonly description = 'OpenAI LLM integration';
  public readonly docsUrl = 'https://platform.openai.com/account/api-keys';
  public readonly helpText = 'Create an OpenAI API key from the developer dashboard and paste it here.';

  public getSchema(): Record<string, any> {
    return openaiConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['OPENAI_API_KEY'];
  }

  public getConfig(): any {
    return openaiConfig;
  }
}
