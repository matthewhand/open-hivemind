import { ILLMProvider } from '../../registry/ILLMProvider';
import { ProviderMetadata } from '../../registry/IProvider';

export class FlowiseProvider implements ILLMProvider {
  id = 'flowise';
  label = 'Flowise';
  type = 'llm' as const;

  getMetadata(): ProviderMetadata {
    return {
      id: 'flowise',
      label: 'Flowise',
      docsUrl: 'https://docs.flowiseai.com/installation/overview',
      helpText: 'Use the Flowise REST endpoint and API key configured in your Flowise instance.',
      sensitiveFields: ['apiKey'],
       configSchema: {
         flowise: {
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
