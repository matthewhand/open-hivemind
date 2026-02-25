import openWebUIConfig from '../config/openWebUIConfig';
import { ILLMProvider } from '../types/IProvider';

export class OpenWebUIProvider implements ILLMProvider {
  public readonly id = 'openwebui';
  public readonly label = 'OpenWebUI';
  public readonly type = 'llm';
  public readonly description = 'OpenWebUI integration';
  public readonly docsUrl = 'https://docs.openwebui.com/';
  public readonly helpText = 'Enable API access in OpenWebUI and copy the token from the administration panel.';

  public getConfig(): any {
      return openWebUIConfig;
  }

  public getSchema(): Record<string, any> {
      return openWebUIConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
      return ['OPENWEBUI_API_KEY'];
  }
}
