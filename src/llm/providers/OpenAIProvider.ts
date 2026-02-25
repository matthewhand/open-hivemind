import { ILLMProvider } from '../../registry/ILLMProvider';
import { ProviderMetadata } from '../../registry/IProvider';

export class OpenAIProvider implements ILLMProvider {
  id = 'openai';
  label = 'OpenAI';
  type = 'llm' as const;

  getMetadata(): ProviderMetadata {
    return {
      id: 'openai',
      label: 'OpenAI',
      docsUrl: 'https://platform.openai.com/account/api-keys',
      helpText: 'Create an OpenAI API key from the developer dashboard and paste it here.',
      sensitiveFields: ['apiKey'],
      configSchema: {
         openai: {
             properties: {
                 apiKey: { type: 'string', sensitive: true }
             }
         }
      }
    };
  }

  async getStatus(): Promise<any> {
    return { ok: true };
  }
}
