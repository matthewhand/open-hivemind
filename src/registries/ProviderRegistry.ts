import {
  type ILLMProvider,
  type IMemoryProvider,
  type IMessageProvider,
  type IProvider,
  type IToolProvider,
} from '../types/IProvider';
import { type IToolInstaller } from '../types/IToolInstaller';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IProvider> = new Map();
  private installers: Map<string, IToolInstaller> = new Map();
  private memoryProviders: Map<string, IMemoryProvider> = new Map();
  private toolProviders: Map<string, IToolProvider> = new Map();

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

  // --- Memory providers ---

  public registerMemoryProvider(name: string, provider: IMemoryProvider): void {
    if (this.memoryProviders.has(name)) {
      console.warn(`Memory provider '${name}' already registered. Overwriting.`);
    }
    this.memoryProviders.set(name, provider);
  }

  public getMemoryProvider(name: string): IMemoryProvider | undefined {
    return this.memoryProviders.get(name);
  }

  public getMemoryProviders(): Map<string, IMemoryProvider> {
    return this.memoryProviders;
  }

  public removeMemoryProvider(name: string): void {
    this.memoryProviders.delete(name);
  }

  // --- Tool providers ---

  public registerToolProvider(name: string, provider: IToolProvider): void {
    if (this.toolProviders.has(name)) {
      console.warn(`Tool provider '${name}' already registered. Overwriting.`);
    }
    this.toolProviders.set(name, provider);
  }

  public getToolProvider(name: string): IToolProvider | undefined {
    return this.toolProviders.get(name);
  }

  public getToolProviders(): Map<string, IToolProvider> {
    return this.toolProviders;
  }

  public removeToolProvider(name: string): void {
    this.toolProviders.delete(name);
  }

  // --- Tool installers ---

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
