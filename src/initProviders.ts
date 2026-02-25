import fs from 'fs';
import path from 'path';
import { ProviderRegistry } from './registries/ProviderRegistry';
import { SlackProvider } from './providers/SlackProvider';
import { DiscordProvider } from './providers/DiscordProvider';
import { MattermostProvider } from './providers/MattermostProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { FlowiseProvider } from './providers/FlowiseProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenWebUIProvider } from './providers/OpenWebUIProvider';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';

export function initProviders(): void {
  // Migration logic for messengers.json
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(process.cwd(), 'config');
    const legacyPath = path.join(configDir, 'messengers.json');
    const providerPath = path.join(configDir, 'providers', 'messengers.json');

    if (fs.existsSync(legacyPath) && !fs.existsSync(providerPath)) {
        fs.mkdirSync(path.dirname(providerPath), { recursive: true });
        fs.copyFileSync(legacyPath, providerPath);
        console.log('Migrated messengers.json to providers/messengers.json');
    }
  } catch (e) {
    console.error('Failed to migrate messengers.json', e);
  }

  const registry = ProviderRegistry.getInstance();

  // Register Message Providers
  registry.register(new SlackProvider());
  registry.register(new DiscordProvider());
  registry.register(new MattermostProvider());

  // Register LLM Providers
  registry.register(new OpenAIProvider());
  registry.register(new FlowiseProvider());
  registry.register(new OllamaProvider());
  registry.register(new OpenWebUIProvider());

  // Register Installers
  registry.registerInstaller(new SwarmInstaller());
}
