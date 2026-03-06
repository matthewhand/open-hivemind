import Debug from 'debug';
import { webUIStorage } from '../storage/webUIStorage';
import { type IMemoryProvider } from './IMemoryProvider';
import { Mem0Provider } from './providers/Mem0Provider';
import { Mem4aiProvider } from './providers/Mem4aiProvider';
import { MemVaultProvider } from './providers/MemVaultProvider';

const debug = Debug('app:memory:MemoryManager');

export class MemoryManager {
  private static instance: MemoryManager;

  // Cached providers by profile ID
  private providers: Map<string, IMemoryProvider> = new Map();

  private constructor() {}

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Get the memory provider for a given profile ID.
   * If the profile is not found or invalid, returns null.
   */
  public getProvider(profileId?: string): IMemoryProvider | null {
    if (!profileId) return null;

    // Check cache
    if (this.providers.has(profileId)) {
      return this.providers.get(profileId)!;
    }

    // Load from WebUI Storage
    const profiles = webUIStorage.getMemoryProfiles();
    const profile = profiles.find((p: any) => p.id === profileId);

    if (!profile) {
      debug(`Memory profile ${profileId} not found.`);
      return null;
    }

    let provider: IMemoryProvider | null = null;
    const config = {
      ...profile.config,
      ttlDays: profile.ttlDays || 0,
    };

    switch (profile.provider?.toLowerCase()) {
      case 'mem0':
        provider = new Mem0Provider(config);
        break;
      case 'mem4ai':
        provider = new Mem4aiProvider(config);
        break;
      case 'memvault':
        provider = new MemVaultProvider(config);
        break;
      default:
        debug(`Unknown memory provider type: ${profile.provider}`);
        return null;
    }

    if (provider) {
      debug(`Initialized memory provider: ${profile.provider} for profile: ${profileId}`);
      this.providers.set(profileId, provider);
    }

    return provider;
  }

  /**
   * Clear provider cache (useful when profiles are updated)
   */
  public clearCache(profileId?: string): void {
    if (profileId) {
      this.providers.delete(profileId);
    } else {
      this.providers.clear();
    }
  }

  /**
   * Track a hit for a memory profile
   */
  public trackHit(profileId?: string): void {
    if (profileId) {
      webUIStorage.incrementMemoryProfileHitCount(profileId);
    }
  }
}
