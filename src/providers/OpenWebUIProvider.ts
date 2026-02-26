import { ILLMProvider } from '../types/IProvider';
import openWebUIConfig from '../config/openWebUIConfig';

export class OpenWebUIProvider implements ILLMProvider {
  id = 'openwebui';
  label = 'OpenWebUI';
  type = 'llm' as const;
  docsUrl = 'https://docs.openwebui.com/';
  helpText = 'Enable API access in OpenWebUI and copy the token from the administration panel.';

  getSchema() {
    return openWebUIConfig.getSchema();
  }

  getConfig() {
    return openWebUIConfig;
  }

  getSensitiveKeys() {
    return ['OPENWEBUI_API_KEY'];
  }
}
