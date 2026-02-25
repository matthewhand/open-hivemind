import { IProvider } from './IProvider';
import { IMessageProvider } from './IMessageProvider';
import { ILLMProvider } from './ILLMProvider';
import { IToolInstaller } from './IToolInstaller';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IProvider> = new Map();

  private constructor() {}

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider: IProvider) {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  getAllProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  getProvidersByType(type: 'message'): IMessageProvider[];
  getProvidersByType(type: 'llm'): ILLMProvider[];
  getProvidersByType(type: 'tool'): IToolInstaller[];
  getProvidersByType(type: string): IProvider[];
  getProvidersByType(type: string): any[] {
    return this.getAllProviders().filter(p => p.type === type);
  }

  getMessageProviders(): IMessageProvider[] {
    return this.getProvidersByType('message');
  }

  getLLMProviders(): ILLMProvider[] {
    return this.getProvidersByType('llm');
  }

  getToolInstallers(): IToolInstaller[] {
    return this.getProvidersByType('tool');
  }
}
