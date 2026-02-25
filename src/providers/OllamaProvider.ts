import ollamaConfig from '../config/ollamaConfig';
import { ILLMProvider } from '../types/IProvider';

export class OllamaProvider implements ILLMProvider {
  public readonly id = 'ollama';
  public readonly label = 'Ollama';
  public readonly type = 'llm' as const;
  public readonly docsUrl = 'https://ollama.ai/';
  public readonly helpText = 'Configure the Ollama API endpoint.';

  public getSchema(): object {
    return ollamaConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
    return []; // Usually local, no keys? Or maybe basic auth?
  }
}
