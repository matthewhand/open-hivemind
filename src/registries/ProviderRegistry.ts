import type { IProvider, ProviderMetadata } from '@hivemind/shared-types';

interface RegistryEntry {
  metadata: ProviderMetadata;
  instance?: IProvider;
}

export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, RegistryEntry> = new Map();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Registers provider metadata (e.g. for configuration schema).
   * Safe to call multiple times; updates metadata if changed.
   */
  public registerMetadata(metadata: ProviderMetadata): void {
    const existing = this.providers.get(metadata.id);
    if (existing) {
      existing.metadata = metadata;
    } else {
      this.providers.set(metadata.id, { metadata });
    }
  }

  /**
   * Registers a running provider instance.
   * If metadata is missing, attempts to fetch it from the instance.
   */
  public registerInstance(instance: IProvider): void {
    let metadata: ProviderMetadata;
    try {
      metadata = instance.getMetadata();
    } catch (e) {
      console.warn('Failed to get metadata from provider instance', e);
      return;
    }

    const existing = this.providers.get(metadata.id);
    if (existing) {
      existing.instance = instance;
      // Also update metadata if provided by instance
      existing.metadata = metadata;
    } else {
      this.providers.set(metadata.id, { metadata, instance });
    }
  }

  public get(id: string): RegistryEntry | undefined {
    return this.providers.get(id);
  }

  public getAll(): RegistryEntry[] {
    return Array.from(this.providers.values());
  }

  public getByType(type: string): RegistryEntry[] {
    return this.getAll().filter((p) => p.metadata.type === type);
  }
}
