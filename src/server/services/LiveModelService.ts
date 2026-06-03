import Debug from 'debug';
import OpenAI from 'openai';
import openaiConfig from '../../config/openaiConfig';
import openWebUIConfig from '../../config/openWebUIConfig';
import { getModelsForProvider, type ModelMetadata } from '../data/llmModels';

const debug = Debug('app:webui:live-model-service');

/**
 * Result of a live model lookup, including whether the data came from a live
 * provider query or the static curated fallback.
 */
export interface LiveModelResult {
  models: ModelMetadata[];
  /** 'live' when fetched from the provider, 'static' when served from the curated list. */
  source: 'live' | 'static';
}

/**
 * Providers for which we can query a live model list. OpenAI and OpenWebUI both
 * expose an OpenAI-compatible `GET /models` endpoint, so a single OpenAI SDK
 * client (pointed at the appropriate base URL) covers both.
 */
const LIVE_PROVIDERS = new Set(['openai', 'openwebui']);

/**
 * Whether a provider supports a live model-list query.
 */
export function supportsLiveModels(providerId: string): boolean {
  return LIVE_PROVIDERS.has(providerId.toLowerCase());
}

interface LiveClientSettings {
  apiKey: string;
  baseURL: string;
}

/**
 * Resolve the OpenAI-compatible client settings (API key + base URL) for a
 * provider, or null when the provider has no live endpoint / is unconfigured.
 */
function resolveClientSettings(providerId: string): LiveClientSettings | null {
  const normalized = providerId.toLowerCase();

  if (normalized === 'openai') {
    const apiKey = openaiConfig.get('OPENAI_API_KEY');
    if (!apiKey) {
      debug('OpenAI API key not configured; cannot query live models');
      return null;
    }
    return { apiKey, baseURL: openaiConfig.get('OPENAI_BASE_URL') };
  }

  if (normalized === 'openwebui') {
    // OpenWebUI exposes an OpenAI-compatible API. The configured URL points at
    // `/api/`; the OpenAI-compatible model list lives under `/api/v1`.
    const rawUrl = openWebUIConfig.get('OPEN_WEBUI_API_URL') as string;
    const baseURL = `${rawUrl.replace(/\/+$/, '')}/v1`;
    // OpenWebUI authenticates with a bearer token (its password/JWT). When absent
    // we still attempt the call; the SDK requires a non-empty key placeholder.
    const apiKey = (openWebUIConfig.get('OPEN_WEBUI_PASSWORD') as string) || 'sk-openwebui';
    return { apiKey, baseURL };
  }

  return null;
}

/**
 * Map a raw provider model id to our ModelMetadata shape, enriching with static
 * metadata when we already know the model, otherwise returning a minimal record.
 */
function toModelMetadata(providerId: string, modelId: string): ModelMetadata {
  const known = getModelsForProvider(providerId).find((m) => m.id === modelId);
  if (known) {
    return known;
  }
  return {
    id: modelId,
    name: modelId,
    description: 'Live model reported by provider',
    type: 'chat',
  };
}

/**
 * Fetch the live model list for a provider, falling back to the curated static
 * list when the provider has no live endpoint, is unconfigured, or the request
 * fails for any reason. Never throws.
 */
export async function getLiveModelsForProvider(
  providerId: string,
  options: { timeoutMs?: number } = {}
): Promise<LiveModelResult> {
  const normalized = providerId.toLowerCase();
  const staticModels = getModelsForProvider(normalized);

  if (!supportsLiveModels(normalized)) {
    return { models: staticModels, source: 'static' };
  }

  const settings = resolveClientSettings(normalized);
  if (!settings) {
    return { models: staticModels, source: 'static' };
  }

  try {
    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseURL,
      timeout: options.timeoutMs ?? 10000,
      maxRetries: 0,
    });

    const list = await client.models.list();
    const ids = list.data.map((m) => m.id).filter((id): id is string => Boolean(id));

    if (ids.length === 0) {
      debug('Live model list for %s was empty; falling back to static', normalized);
      return { models: staticModels, source: 'static' };
    }

    const models = ids.map((id) => toModelMetadata(normalized, id));
    return { models, source: 'live' };
  } catch (error) {
    debug(
      'Live model query for %s failed (%s); falling back to static',
      normalized,
      error instanceof Error ? error.message : String(error)
    );
    return { models: staticModels, source: 'static' };
  }
}
