import flowiseConfig from '../config/flowiseConfig';
import { ILLMProvider } from '../types/IProvider';

export class FlowiseProvider implements ILLMProvider {
  public readonly id = 'flowise';
  public readonly label = 'Flowise';
  public readonly type = 'llm';
  public readonly description = 'Flowise LLM integration';
  public readonly docsUrl = 'https://docs.flowiseai.com/installation/overview';
  public readonly helpText = 'Use the Flowise REST endpoint and API key configured in your Flowise instance.';

  public getSchema(): Record<string, any> {
    return flowiseConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return ['FLOWISE_API_KEY'];
  }

  public getConfig(): any {
    return flowiseConfig;
  }
}
