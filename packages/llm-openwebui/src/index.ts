import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { OpenWebUIProvider, type OpenWebUIProviderConfig } from './openWebUIProvider';

export {
  openWebUIProvider,
  OpenWebUIProvider,
  type OpenWebUIProviderConfig,
} from './openWebUIProvider';
export { generateChatCompletion } from './runInference';
export { schema } from './schema';

/**
 * Standard factory — preferred entry point for PluginLoader.
 * Returns a fresh provider per call so each bot keeps its own config
 * (apiUrl / authHeader / apiKey / model) isolated from the process-wide
 * `OPEN_WEBUI_*` defaults.
 *
 * The PluginLoader passes config in two shapes: the plain provider keys
 * (`apiUrl`/`apiKey`/`model`) and the raw env-var names from the schema
 * (`OPEN_WEBUI_API_URL`, `OPEN_WEBUI_API_KEY`, `OPEN_WEBUI_MODEL`). Both
 * are honored.
 */
export function create(
  config?: (OpenWebUIProviderConfig & Record<string, unknown>) | null
): OpenWebUIProvider {
  const c = (config ?? {}) as Record<string, unknown>;
  return new OpenWebUIProvider({
    apiUrl: (c.apiUrl as string) ?? (c.OPEN_WEBUI_API_URL as string),
    authHeader: c.authHeader as string,
    apiKey: (c.apiKey as string) ?? (c.OPEN_WEBUI_API_KEY as string),
    model: (c.model as string) ?? (c.OPEN_WEBUI_MODEL as string),
    embeddingModel: (c.embeddingModel as string) ?? (c.OPEN_WEBUI_EMBEDDING_MODEL as string),
  });
}

export const manifest: PluginManifest = {
  displayName: 'OpenWebUI',
  description: 'Connect to a self-hosted OpenWebUI instance',
  type: 'llm',
  minVersion: '1.0.0',
};
