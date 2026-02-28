import ollamaConfig from '../config/ollamaConfig';
import { type ILLMProvider } from '../types/IProvider';

export class OllamaProvider implements ILLMProvider {
  id = 'ollama';
  label = 'Ollama';
  type = 'llm' as const;
  docsUrl = 'https://ollama.ai/';
  helpText = 'Configure the Ollama API endpoint.';

  getSchema() {
    return ollamaConfig.getSchema();
  }

  getConfig() {
    return ollamaConfig;
  }

  getSensitiveKeys() {
    return [];
  }
}
