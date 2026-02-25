import { IProvider, IMessageProvider, ILLMProvider, IToolInstaller } from '../types/IProvider';

class ProviderRegistry {
  private providers: Map<string, IProvider> = new Map();
  private installers: Map<string, IToolInstaller> = new Map();

  constructor() {
    // Singleton pattern
  }

  public register(provider: IProvider): void {
    if (provider.type === 'tool') {
      this.installers.set(provider.id, provider as IToolInstaller);
    }
    this.providers.set(provider.id, provider);
  }

  public get(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  public getByType(type: 'messenger' | 'llm' | 'tool' | 'other'): IProvider[] {
    return this.getAll().filter(p => p.type === type);
  }

  public getMessageProviders(): IMessageProvider[] {
    return this.getByType('messenger') as IMessageProvider[];
  }

  public getLLMProviders(): ILLMProvider[] {
    return this.getByType('llm') as ILLMProvider[];
  }

  public getInstaller(id: string): IToolInstaller | undefined {
    return this.installers.get(id);
  }

  public getAllInstallers(): IToolInstaller[] {
    return Array.from(this.installers.values());
  }
}

export const providerRegistry = new ProviderRegistry();
