import { ILLMProvider } from '../types/IProvider';
import ollamaConfig from '../config/ollamaConfig';

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
