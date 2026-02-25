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

  public register(provider: IProvider): void {
    this.providers.set(provider.id, provider);
  }

  public registerInstaller(installer: IToolInstaller): void {
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
    return this.getAllProviders().filter(p => p.type === 'message') as IMessageProvider[];
  }

  public getLLMProviders(): ILLMProvider[] {
    return this.getAllProviders().filter(p => p.type === 'llm') as ILLMProvider[];
  }

  public getAllInstallers(): IToolInstaller[] {
    return Array.from(this.installers.values());
  }
}
