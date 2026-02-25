import { ProviderRegistry } from './registries/ProviderRegistry';
import { DiscordProvider } from './providers/DiscordProvider';
import { FlowiseProvider } from './providers/FlowiseProvider';
import { MattermostProvider } from './providers/MattermostProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { OpenWebUIProvider } from './providers/OpenWebUIProvider';
import { SlackProvider } from './providers/SlackProvider';
import { SwarmInstallerProvider } from './providers/SwarmInstallerProvider';
import { WebhookProvider } from './providers/WebhookProvider';

// Initialize providers immediately upon import
const registry = ProviderRegistry.getInstance();

registry.registerProvider(new DiscordProvider());
registry.registerProvider(new FlowiseProvider());
registry.registerProvider(new MattermostProvider());
registry.registerProvider(new OllamaProvider());
registry.registerProvider(new OpenAIProvider());
registry.registerProvider(new OpenWebUIProvider());
registry.registerProvider(new SlackProvider());
registry.registerProvider(new WebhookProvider());

registry.registerInstaller(new SwarmInstallerProvider());

console.log('[Init] Providers registered.');
