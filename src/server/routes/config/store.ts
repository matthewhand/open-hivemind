import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import llmConfig from '../../../config/llmConfig';
import llmTaskConfig from '../../../config/llmTaskConfig';
import messageConfig from '../../../config/messageConfig';
import webhookConfig from '../../../config/webhookConfig';
import { providerRegistry } from '../../../registries/ProviderRegistry';
import { createLogger } from '../../../common/StructuredLogger';

const debug = Debug('app:server:routes:config:store');
const logger = createLogger('configStore');

// Core schemas that are always present
export const coreSchemaSources: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  llmTask: llmTaskConfig,
  webhook: webhookConfig,
};

// Map of base config types to their convict objects (used as schema sources)
export let schemaSources: Record<string, any> = { ...coreSchemaSources };

// Map of all active config instances
export let globalConfigs: Record<string, any> = { ...schemaSources };

// Helper to load dynamic configs from files
export const loadDynamicConfigs = async () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    try {
      const files = await fs.promises.readdir(providersDir);

      files.forEach((file) => {
        // Match pattern: type-name.json e.g. openai-dev.json
        const match = file.match(/^([a-z]+)-(.+)\.json$/);
        if (match) {
          const type = match[1];
          const name = match[0].replace('.json', ''); // e.g. openai-dev

          if (schemaSources[type] && !globalConfigs[name]) {
            debug(`Loading dynamic config: ${name} (type: ${type})`);
            // Create new convict instance using the base type's schema
            const convict = require('convict'); // Require local to avoid module caching issues if any

            // schemaSources[type] is likely a convict instance (if from provider.getConfig() or core),
            // so .getSchema() works.
            const newConfig = convict(schemaSources[type].getSchema());

            // Load file
            newConfig.loadFile(path.join(providersDir, file));
            try {
              newConfig.validate({ allowed: 'warn' });
            } catch (e) {
              logger.warn(`Validation warning for ${name}:`, e);
            }

            globalConfigs[name] = newConfig;
          }
        }
      });
    } catch (e: any) {
      if ((e as any).code !== 'ENOENT') {
        throw e;
      }
    }
  } catch (e) {
    logger.error('Failed to load dynamic configs:', e);
  }
};

// Initialize configuration from registry
export const reloadGlobalConfigs = async () => {
  const providers = providerRegistry.getAll();
  providers.forEach((p) => {
    schemaSources[p.id] = p.getConfig();
  });

  // Reset globalConfigs with updated schemas
  globalConfigs = { ...schemaSources };

  // Load dynamic configs
  await loadDynamicConfigs();

  debug(
    'Global configs reloaded with providers:',
    providers.map((p) => p.id)
  );
};
