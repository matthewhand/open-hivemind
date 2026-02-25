import ollamaConfig from '../config/ollamaConfig';
import { ILLMProvider } from '../types/IProvider';

export class OllamaProvider implements ILLMProvider {
  public readonly id = 'ollama';
  public readonly label = 'Ollama';
  public readonly type = 'llm';
  public readonly description = 'Ollama local LLM';

  public getConfig(): any {
      return ollamaConfig;
  }

  public getSchema(): Record<string, any> {
      return ollamaConfig.getSchema();
  }

  public getSensitiveKeys(): string[] {
      return [];
  }
}
