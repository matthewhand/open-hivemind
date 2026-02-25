import { IProvider, ProviderMetadata } from '@hivemind/shared-types';

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, IProvider> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register(provider: IProvider): void {
    const metadata = provider.getMetadata();
    if (this.providers.has(metadata.id)) {
      console.warn(`Provider ${metadata.id} already registered. Overwriting.`);
    }
    this.providers.set(metadata.id, provider);
  }

  public getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  public get(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  public getByType(type: ProviderMetadata['type']): IProvider[] {
    return this.getAll().filter((p) => p.getMetadata().type === type);
  }
}
