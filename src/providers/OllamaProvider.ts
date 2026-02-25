import { ILLMProvider } from '../types/IProvider';
import ollamaConfig from '../config/ollamaConfig';

export interface OllamaConfig {
  OLLAMA_BASE_URL: string;
  OLLAMA_MODEL: string;
  OLLAMA_TEMPERATURE: number;
  OLLAMA_SYSTEM_PROMPT: string;
  OLLAMA_CONTEXT_WINDOW: number;
}

export class OllamaProvider implements ILLMProvider<OllamaConfig> {
  id = 'ollama';
  label = 'Ollama';
  type = 'llm' as const;
  docsUrl = 'https://ollama.ai/docs';
  helpText = 'Configure Ollama base URL and model name.';

  getSchema() {
    return ollamaConfig.getSchema();
  }

  getConfig() {
    return ollamaConfig as any;
  }

  getSensitiveKeys() {
    return [];
  }
}
