import { IProvider } from '../types/IProvider';

export class ProviderRegistry {
  private providers: Map<string, IProvider> = new Map();

  register(provider: IProvider) {
    const metadata = provider.getMetadata();
    console.log(`[ProviderRegistry] Registering provider: ${metadata.id} (${metadata.type})`);
    this.providers.set(metadata.id, provider);
  }

  get(id: string): IProvider | undefined {
    return this.providers.get(id);
  }

  getAll(): IProvider[] {
    return Array.from(this.providers.values());
  }

  getByType(type: 'message' | 'llm'): IProvider[] {
    return this.getAll().filter((p) => p.getMetadata().type === type);
  }
}

export const providerRegistry = new ProviderRegistry();
