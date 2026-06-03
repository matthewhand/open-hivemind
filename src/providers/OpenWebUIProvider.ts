import openWebUIConfig from '../config/openWebUIConfig';
import { type ILLMProvider } from '../types/IProvider';

export class OpenWebUIProvider implements ILLMProvider {
  id = 'openwebui';
  label = 'OpenWebUI';
  type = 'llm' as const;
  docsUrl = 'https://docs.openwebui.com/';
  helpText = 'Enable API access in OpenWebUI and copy the token from the administration panel.';

  getSchema(): Record<string, unknown> {
    return openWebUIConfig.getSchema() as unknown as Record<string, unknown>;
  }

  getConfig(): Record<string, unknown> {
    return openWebUIConfig as unknown as Record<string, unknown>;
  }

  getSensitiveKeys() {
    return ['OPENWEBUI_API_KEY'];
  }
}
