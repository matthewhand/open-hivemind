/**
 * Messenger service lookup by provider name.
 *
 * Resolution order:
 *  1. Live instance registered in the SyncProviderRegistry at startup.
 *  2. Lazy load via the PluginLoader (`@hivemind/message-<name>` workspace
 *     packages or community plugins), cached after first successful load.
 *
 * A type guard ensures only valid IMessengerService implementations are
 * returned.
 */
import Debug from 'debug';
import type { IMessengerService } from '@hivemind/shared-types';
import { instantiateMessageService, loadPlugin } from '@src/plugins/PluginLoader';
import { SyncProviderRegistry } from '@src/registries/SyncProviderRegistry';
import { getServiceDependencies } from '@src/utils/serviceDependencies';

const debug = Debug('app:ProviderRegistry');

// Cache of lazily loaded providers (keyed by normalized provider name)
const loadedProviders = new Map<string, IMessengerService>();

/**
 * Type guard to check if an instance implements IMessengerService.
 */
function isMessengerService(obj: unknown): obj is IMessengerService {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  const o = obj as Record<string, unknown>;
  return (
    typeof o.initialize === 'function' &&
    typeof o.sendMessageToChannel === 'function' &&
    typeof o.getMessagesFromChannel === 'function' &&
    typeof o.shutdown === 'function'
  );
}

/**
 * Get a messenger service by provider name (e.g. 'discord', 'slack').
 * Returns null if no plugin exists for the provider or it fails validation.
 */
export async function getMessengerServiceByProvider(
  providerName: string
): Promise<IMessengerService | null> {
  const normalizedName = providerName.toLowerCase();

  // 1. Prefer the live instance registered at startup
  const registry = SyncProviderRegistry.getInstance();
  if (registry.isInitialized()) {
    const live = registry.getMessengerService(normalizedName);
    if (live) {
      return live;
    }
  }

  // 2. Cache from a previous lazy load
  const cachedProvider = loadedProviders.get(normalizedName);
  if (cachedProvider) {
    return cachedProvider;
  }

  // 3. Lazy load via the PluginLoader
  try {
    debug(`Loading provider plugin: message-${normalizedName}`);
    const mod = await loadPlugin(`message-${normalizedName}`);
    const service = instantiateMessageService(
      mod,
      undefined,
      getServiceDependencies('ProviderRegistry')
    );

    if (!isMessengerService(service)) {
      debug(`Plugin "message-${normalizedName}" does not implement IMessengerService correctly`);
      return null;
    }

    loadedProviders.set(normalizedName, service);
    debug(`Successfully loaded provider: ${providerName}`);
    return service;
  } catch (error: unknown) {
    debug(
      `Failed to load provider "${providerName}": ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Unload a provider from the lazy-load cache (e.g. when disabling).
 */
export function unloadProvider(providerName: string): void {
  const normalizedName = providerName.toLowerCase();
  if (loadedProviders.delete(normalizedName)) {
    debug(`Unloaded provider: ${providerName}`);
  }
}
