import { ILLMProvider } from '../types/IProvider';
import openWebUIConfig from '../config/openWebUIConfig';

export class OpenWebUIProvider implements ILLMProvider {
  public readonly id = 'openwebui';
  public readonly label = 'OpenWebUI';
  public readonly type = 'llm' as const;
  public readonly description = 'OpenWebUI integration';
  public readonly docsUrl = 'https://docs.openwebui.com/';
  public readonly helpText = 'Enable API access in OpenWebUI and copy the token from the administration panel.';

  public getSchema(): object {
    return (openWebUIConfig as any).getSchema ? (openWebUIConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }
}
