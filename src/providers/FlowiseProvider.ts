import { ILLMProvider } from '../types/IProvider';
import flowiseConfig from '../config/flowiseConfig';

export interface FlowiseConfig {
  FLOWISE_API_ENDPOINT: string;
  FLOWISE_API_KEY: string;
  FLOWISE_CONVERSATION_CHATFLOW_ID: string;
  FLOWISE_COMPLETION_CHATFLOW_ID: string;
  FLOWISE_USE_REST: boolean;
}

export class FlowiseProvider implements ILLMProvider<FlowiseConfig> {
  id = 'flowise';
  label = 'Flowise';
  type = 'llm' as const;
  docsUrl = 'https://docs.flowiseai.com/';
  helpText = 'Configure Flowise API endpoint and chatflow IDs.';

  getSchema() {
    return flowiseConfig.getSchema();
  }

  getConfig() {
    return flowiseConfig as any;
  }

  getSensitiveKeys() {
    return ['FLOWISE_API_KEY'];
  }
}
