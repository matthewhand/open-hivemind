import { ILLMProvider } from '../types/IProvider';
import flowiseConfig from '../config/flowiseConfig';

export class FlowiseProvider implements ILLMProvider {
  id = 'flowise';
  label = 'Flowise';
  type = 'llm' as const;
  docsUrl = 'https://docs.flowiseai.com/installation/overview';
  helpText = 'Use the Flowise REST endpoint and API key configured in your Flowise instance.';

  getSchema() {
    return flowiseConfig.getSchema();
  }

  getConfig() {
    return flowiseConfig;
  }

  getSensitiveKeys() {
    return ['FLOWISE_API_KEY'];
  }
}
