import { type ILLMProvider, type IMessageProvider, type IProvider } from '../types/IProvider';
import { type IToolInstaller } from '../types/IToolInstaller';

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
    if (this.providers.has(provider.id)) {
      console.warn(`Provider with id ${provider.id} already registered. Overwriting.`);
    }
    this.providers.set(provider.id, provider);
  }

  public get(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  public getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  public getMessageProviders(): IMessageProvider[] {
    return this.getAll().filter((p) => p.type === 'messenger') as IMessageProvider[];
  }

  public getLLMProviders(): ILLMProvider[] {
    return this.getAll().filter((p) => p.type === 'llm') as ILLMProvider[];
  }

  public registerInstaller(installer: IToolInstaller): void {
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
