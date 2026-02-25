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

  public registerProvider(provider: IProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider with id ${provider.id} is already registered. Overwriting.`);
    }
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IProvider[] {
    return Array.from(this.providers.values());
  }

  public getMessageProviders(): IMessageProvider[] {
    return this.getAllProviders().filter(
      (p): p is IMessageProvider => (p as any).type === 'message'
    );
  }

  public getLlmProviders(): ILLMProvider[] {
    return this.getAllProviders().filter((p): p is ILLMProvider => (p as any).type === 'llm');
  }

  public registerInstaller(installer: IToolInstaller): void {
    if (this.installers.has(installer.id)) {
      console.warn(`Installer with id ${installer.id} is already registered. Overwriting.`);
    }
    this.installers.set(installer.id, installer);
  }

  public getInstaller(id: string): IToolInstaller | undefined {
    return this.installers.get(id);
  }

  public getAllInstallers(): IToolInstaller[] {
    return Array.from(this.installers.values());
  }
}

export const providerRegistry = ProviderRegistry.getInstance();
