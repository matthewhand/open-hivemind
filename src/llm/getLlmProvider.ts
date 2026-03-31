import Debug from 'debug';
import { getLlmProfileByKey } from '@src/config/llmProfiles';
import ProviderConfigManager from '@src/config/ProviderConfigManager';
import { UserConfigStore } from '@src/config/UserConfigStore';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';
import { instantiateLlmProvider, loadPlugin } from '@src/plugins/PluginLoader';
import type { IConfigAccessor } from '@src/types/configAccessor';
import llmConfig from '@config/llmConfig';
import type { ILlmProvider } from '@llm/interfaces/ILlmProvider';
import type { IMessage } from '@message/interfaces/IMessage';

const debug = Debug('app:getLlmProvider');

interface CachedProvider {
  instance: ILlmProvider;
  configHash: string;
}

const providerCache = new Map<string, CachedProvider>();

function withTokenCounting(provider: ILlmProvider, _instanceId: string): ILlmProvider {
  const metrics = MetricsCollector.getInstance();

  return {
    name: provider.name,
    supportsChatCompletion: provider.supportsChatCompletion,
    supportsCompletion: provider.supportsCompletion,
    supportsHistory: provider.supportsHistory,
    // Add instance ID to provider object if interface allows, to help tracking?
    // For now we map it.
    generateChatCompletion: async (
      userMessage: string,
      historyMessages: IMessage[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata?: Record<string, any>
    ): Promise<string> => {
      const response = await provider.generateChatCompletion(
        userMessage,
        historyMessages,
        metadata
      );
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
    generateCompletion: async (userMessage: string): Promise<string> => {
      const response = await provider.generateCompletion(userMessage);
      if (response) {
        metrics.recordLlmTokenUsage(response.length);
      }
      return response;
    },
  };
}

export async function getLlmProvider(): Promise<ILlmProvider[]> {
  const providerManager = ProviderConfigManager.getInstance();
  const configuredProviders = providerManager.getAllProviders('llm').filter((p) => p.enabled);

  const activeProviderIds = new Set<string>();
  const llmProviders: ILlmProvider[] = [];

  // Highest priority: defaultChatbotProfile from user config
  const generalSettings = UserConfigStore.getInstance().getGeneralSettings();
  const defaultProfileKey = generalSettings.defaultChatbotProfile;
  if (typeof defaultProfileKey === 'string' && defaultProfileKey.trim() !== '') {
    const profile = getLlmProfileByKey(defaultProfileKey.trim());
    if (profile) {
      const profileId = `profile-${profile.key}`;
      const configHash = JSON.stringify(profile.config || {});
      const cached = providerCache.get(profileId);

      if (cached && cached.configHash === configHash) {
        llmProviders.push(cached.instance);
        activeProviderIds.add(profileId);
      } else {
        try {
          const mod = await loadPlugin(`llm-${profile.provider.toLowerCase()}`);
          const instance = instantiateLlmProvider(mod, profile.config);
          debug(
            `Initialized LLM provider from default chatbot profile: ${profile.name} (${profile.provider})`
          );
          const wrappedInstance = withTokenCounting(instance, profileId);
          providerCache.set(profileId, { instance: wrappedInstance, configHash });
          llmProviders.push(wrappedInstance);
          activeProviderIds.add(profileId);
        } catch (err) {
          debug(
            `Failed to load LLM provider from default chatbot profile '${defaultProfileKey}': ${err}`
          );
        }
      }
    } else {
      debug(
        `Warning: defaultChatbotProfile '${defaultProfileKey}' not found in LLM profiles, falling through to other providers`
      );
    }
  }

  if (configuredProviders.length > 0) {
    // New System: Use configured instances
    for (const config of configuredProviders) {
      try {
        const configHash = JSON.stringify(config.config || {});
        const cached = providerCache.get(config.id);

        if (cached && cached.configHash === configHash) {
          llmProviders.push(cached.instance);
          activeProviderIds.add(config.id);
          continue;
        }

        let instance: ILlmProvider | undefined;
        try {
          const mod = await loadPlugin(`llm-${config.type.toLowerCase()}`);
          instance = instantiateLlmProvider(mod, config.config);
          debug(`Initialized LLM provider via plugin loader: ${config.type} (${config.name})`);
        } catch (err) {
          debug(`Failed to load LLM plugin 'llm-${config.type}': ${err}`);
        }

        if (instance) {
          // We could attach the instance ID to the provider object if we extend the interface
          // We wrap it to count tokens
          const wrappedInstance = withTokenCounting(instance, config.id);
          providerCache.set(config.id, { instance: wrappedInstance, configHash });
          llmProviders.push(wrappedInstance);
          activeProviderIds.add(config.id);
        }
      } catch (error) {
        debug(`Failed to initialize provider ${config.name}: ${error}`);
      }
    }
  }

  if (llmProviders.length === 0) {
    // Fallback: Check Legacy Env Var (LLM_PROVIDER)
    // This is necessary if no migration happened or it failed, or for quick development.
    const rawProvider: unknown = (llmConfig as unknown as IConfigAccessor).get('LLM_PROVIDER');
    const legacyTypes = (
      typeof rawProvider === 'string'
        ? rawProvider.split(',').map((v: string) => v.trim())
        : Array.isArray(rawProvider)
          ? rawProvider
          : []
    ) as string[];

    if (legacyTypes.length > 0 && legacyTypes[0] !== '') {
      debug(`Fallback to legacy LLM_PROVIDER env var: ${legacyTypes.join(',')}`);
      for (const type of legacyTypes) {
        const legacyId = `legacy-${type}`;
        const configHash = 'legacy-env';

        const cached = providerCache.get(legacyId);
        if (cached && cached.configHash === configHash) {
          llmProviders.push(cached.instance);
          activeProviderIds.add(legacyId);
          continue;
        }

        let instance: ILlmProvider | undefined;
        try {
          const mod = await loadPlugin(`llm-${type.toLowerCase()}`);
          instance = instantiateLlmProvider(mod, {});
          debug(`Initialized legacy LLM provider via plugin loader: ${type}`);
        } catch (err) {
          debug(`Failed to load legacy LLM plugin 'llm-${type}': ${err}`);
        }
        if (instance) {
          const wrappedInstance = withTokenCounting(instance, 'legacy');
          providerCache.set(legacyId, { instance: wrappedInstance, configHash });
          llmProviders.push(wrappedInstance);
          activeProviderIds.add(legacyId);
        }
      }
    }
  }

  if (llmProviders.length === 0) {
    // If still empty, default to OpenAI (legacy default)
    debug('No providers configured, defaulting to OpenAI (Legacy default)');
    const defaultId = 'default-openai';
    const configHash = 'default';

    const cached = providerCache.get(defaultId);
    if (cached && cached.configHash === configHash) {
      llmProviders.push(cached.instance);
      activeProviderIds.add(defaultId);
    } else {
      const mod = await loadPlugin('llm-openai');
      const instance = instantiateLlmProvider(mod, {});
      const wrappedInstance = withTokenCounting(instance, 'default');
      providerCache.set(defaultId, { instance: wrappedInstance, configHash });
      llmProviders.push(wrappedInstance);
      activeProviderIds.add(defaultId);
    }
  }

  // Prune cache (only prune system-level providers, not bot-specific ones)
  for (const key of providerCache.keys()) {
    if (!activeProviderIds.has(key) && !key.startsWith('bot:')) {
      providerCache.delete(key);
      debug(`Removed stale provider from cache: ${key}`);
    }
  }

  return llmProviders;
}

/**
 * Resolve an LLM provider for a specific bot configuration.
 *
 * When a bot has an `llmProvider` type and provider-specific config
 * (e.g. `openai`, `flowise`, `openwebui`, `openswarm`) — typically
 * populated via an LLM profile — this function creates (and caches)
 * a dedicated provider instance so the bot uses its own model/key
 * instead of the system default.
 *
 * Falls back to the first system-level provider when the bot has no
 * provider-specific config.
 */
export async function getLlmProviderForBot(
  botConfig: Record<string, unknown>
): Promise<ILlmProvider> {
  const botName = String(botConfig.name || botConfig.BOT_ID || 'unknown');
  const providerType = String(botConfig.llmProvider || botConfig.LLM_PROVIDER || '').toLowerCase();

  // Extract the provider-specific config block from the bot config.
  const providerSpecificConfig =
    providerType && typeof botConfig[providerType] === 'object' && botConfig[providerType] !== null
      ? (botConfig[providerType] as Record<string, unknown>)
      : null;

  // Only create a dedicated instance if there is a provider type AND
  // provider-specific config (i.e. the profile was applied).
  if (providerType && providerSpecificConfig) {
    const configHash = JSON.stringify(providerSpecificConfig);
    const cacheKey = `bot:${botName}:${providerType}`;

    const cached = providerCache.get(cacheKey);
    if (cached && cached.configHash === configHash) {
      debug(`Using cached bot-level LLM provider for "${botName}" (${providerType})`);
      return cached.instance;
    }

    try {
      const mod = await loadPlugin(`llm-${providerType}`);
      const instance = instantiateLlmProvider(mod, providerSpecificConfig);
      const wrapped = withTokenCounting(instance, cacheKey);
      providerCache.set(cacheKey, { instance: wrapped, configHash });
      debug(`Created bot-level LLM provider for "${botName}" (${providerType})`);
      return wrapped;
    } catch (err) {
      debug(
        `Failed to create bot-level LLM provider for "${botName}" (${providerType}): ${err}. Falling back to system default.`
      );
    }
  }

  // Fallback: return the first system-level provider.
  const systemProviders = await getLlmProvider();
  if (systemProviders.length === 0) {
    throw new Error('No LLM provider available (system or bot-level)');
  }
  return systemProviders[0];
}
