import flowiseConfig from '../config/flowiseConfig';
import { type ILLMProvider } from '../types/IProvider';

export class FlowiseProvider implements ILLMProvider {
  id = 'flowise';
  label = 'Flowise';
  type = 'llm' as const;
  docsUrl = 'https://docs.flowiseai.com/installation/overview';
  helpText = 'Use the Flowise REST endpoint and API key configured in your Flowise instance.';

  getSchema(): Record<string, unknown> {
    return flowiseConfig.getSchema() as unknown as Record<string, unknown>;
  }

  getConfig(): Record<string, unknown> {
    return flowiseConfig as unknown as Record<string, unknown>;
  }

  getSensitiveKeys() {
    return ['FLOWISE_API_KEY'];
  }
}
