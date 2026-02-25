import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import messageConfig from '../config/messageConfig';
import llmConfig from '../config/llmConfig';
import webhookConfig from '../config/webhookConfig';
import { ProviderRegistry } from '../registries/ProviderRegistry';

const debug = Debug('app:server:configLoader');

// Map of base config types to their convict objects (used as schema sources)
export const coreSchemas: Record<string, any> = {
  message: messageConfig,
  llm: llmConfig,
  webhook: webhookConfig,
};

export let schemaSources: Record<string, any> = { ...coreSchemas };

export function refreshSchemaSources() {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getAllProviders();
    schemaSources = { ...coreSchemas };
    for (const p of providers) {
        schemaSources[p.id] = { getSchema: () => p.getSchema() };
    }
}

// Map of all active config instances
export const globalConfigs: Record<string, any> = { ...schemaSources };

// Helper to load dynamic configs from files
export const loadDynamicConfigs = () => {
  refreshSchemaSources();

  // Ensure globalConfigs has core schemas
  for(const key of Object.keys(coreSchemas)) {
      if(!globalConfigs[key]) globalConfigs[key] = coreSchemas[key];
  }

  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const providersDir = path.join(configDir, 'providers');

    if (fs.existsSync(providersDir)) {
      const files = fs.readdirSync(providersDir);

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
            const newConfig = convict(schemaSources[type].getSchema());

            // Load file
            newConfig.loadFile(path.join(providersDir, file));
            try {
              newConfig.validate({ allowed: 'warn' });
            } catch (e) {
              console.warn(`Validation warning for ${name}:`, e);
            }

            globalConfigs[name] = newConfig;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to load dynamic configs:', e);
  }
};
