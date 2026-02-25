import { ILLMProvider } from '../types/IProvider';
import openaiConfig from '../config/openaiConfig';

export class OpenAIProvider implements ILLMProvider {
  public readonly id = 'openai';
  public readonly label = 'OpenAI';
  public readonly type = 'llm' as const;
  public readonly description = 'OpenAI GPT models';
  public readonly docsUrl = 'https://platform.openai.com/account/api-keys';
  public readonly helpText = 'Create an OpenAI API key from the developer dashboard and paste it here.';

  public getSchema(): object {
    return (openaiConfig as any).getSchema ? (openaiConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }
}
