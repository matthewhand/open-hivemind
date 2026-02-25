import { ILLMProvider } from '../types/IProvider';
import ollamaConfig from '../config/ollamaConfig';

export class OllamaProvider implements ILLMProvider {
  public readonly id = 'ollama';
  public readonly label = 'Ollama';
  public readonly type = 'llm' as const;
  public readonly description = 'Local LLMs with Ollama';
  public readonly docsUrl = 'https://ollama.ai/';
  public readonly helpText = 'Configure the Ollama API endpoint (default: http://localhost:11434).';

  public getSchema(): object {
    return (ollamaConfig as any).getSchema ? (ollamaConfig as any).getSchema() : {};
  }

  public getSensitiveKeys(): string[] {
    const schema = this.getSchema();
    return Object.keys(schema).filter(k =>
      k.toUpperCase().includes('TOKEN') || k.toUpperCase().includes('SECRET') || k.toUpperCase().includes('KEY')
    );
  }
}
