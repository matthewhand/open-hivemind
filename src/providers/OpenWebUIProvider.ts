import { ILLMProvider } from '../types/IProvider';
import openWebUIConfig from '../config/openWebUIConfig';

export interface OpenWebUIConfig {
  OPEN_WEBUI_API_URL: string;
  OPEN_WEBUI_USERNAME: string;
  OPEN_WEBUI_PASSWORD: string;
  OPEN_WEBUI_KNOWLEDGE_FILE: string;
  OPEN_WEBUI_MODEL: string;
}

export class OpenWebUIProvider implements ILLMProvider<OpenWebUIConfig> {
  id = 'openwebui';
  label = 'OpenWebUI';
  type = 'llm' as const;
  docsUrl = 'https://docs.openwebui.com/';
  helpText = 'Configure OpenWebUI connection details.';

  getSchema() {
    return openWebUIConfig.getSchema();
  }

  getConfig() {
    return openWebUIConfig as any;
  }

  getSensitiveKeys() {
    return ['OPEN_WEBUI_PASSWORD'];
  }
}
