import { ILLMProvider } from '../types/IProvider';
import flowiseConfig from '../config/flowiseConfig';

export class FlowiseProvider implements ILLMProvider {
  public readonly id = 'flowise';
  public readonly label = 'Flowise';
  public readonly type = 'llm' as const;
  public readonly description = 'Flowise AI visual tool builder';
  public readonly docsUrl = 'https://docs.flowiseai.com/installation/overview';
  public readonly helpText = 'Use the Flowise REST endpoint and API key configured in your Flowise instance.';

  public getSchema(): object {
    return (flowiseConfig as any).getSchema ? (flowiseConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }
}
