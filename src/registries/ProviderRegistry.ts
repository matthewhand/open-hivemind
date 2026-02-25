import { IProvider, IMessageProvider, ILLMProvider } from '../types/IProvider';
import { IToolInstaller } from '../types/IToolInstaller';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IProvider> = new Map();
  private installers: Map<string, IToolInstaller> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerProvider(provider: IProvider) {
    this.providers.set(provider.id, provider);
  }

  public registerInstaller(installer: IToolInstaller) {
    this.installers.set(installer.id, installer);
  }

  public getProvider(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  public getInstaller(id: string): IToolInstaller | undefined {
    return this.installers.get(id);
  }

  public getAllProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  public getMessageProviders(): IMessageProvider[] {
    return Array.from(this.providers.values()).filter(
      (p): p is IMessageProvider => p.type === 'message'
    );
  }

  public getLLMProviders(): ILLMProvider[] {
    return Array.from(this.providers.values()).filter(
      (p): p is ILLMProvider => p.type === 'llm'
    );
  }
}
