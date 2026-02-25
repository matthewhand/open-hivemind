import { ILLMProvider } from '../../registry/ILLMProvider';
import { ProviderMetadata } from '../../registry/IProvider';

export class OpenWebUIProvider implements ILLMProvider {
  id = 'openwebui';
  label = 'OpenWebUI';
  type = 'llm' as const;

  getMetadata(): ProviderMetadata {
    return {
      id: 'openwebui',
      label: 'OpenWebUI',
      docsUrl: 'https://docs.openwebui.com/',
      helpText: 'Enable API access in OpenWebUI and copy the token from the administration panel.',
      sensitiveFields: ['apiKey'],
       configSchema: {
         openwebui: {
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
