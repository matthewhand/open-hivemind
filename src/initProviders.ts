import { providerRegistry } from './registries/ProviderRegistry';
import { SlackProvider } from './providers/SlackProvider';
import { DiscordProvider } from './providers/DiscordProvider';
import { MattermostProvider } from './providers/MattermostProvider';
import { GenericConfigProvider } from './providers/GenericConfigProvider';
import { SwarmInstallerProvider } from './providers/SwarmInstallerProvider';
import openaiConfig from './config/openaiConfig';
import flowiseConfig from './config/flowiseConfig';
import ollamaConfig from './config/ollamaConfig';
import openWebUIConfig from './config/openWebUIConfig';
import webhookConfig from './config/webhookConfig';
import messageConfig from './config/messageConfig';
import llmConfig from './config/llmConfig';

export function initProviders() {
  providerRegistry.register(new SlackProvider());
  providerRegistry.register(new DiscordProvider());
  providerRegistry.register(new MattermostProvider());

  providerRegistry.register(new GenericConfigProvider('openai', 'OpenAI', openaiConfig, 'llm', 'https://platform.openai.com/account/api-keys', 'Create an OpenAI API key from the developer dashboard and paste it here.'));
  providerRegistry.register(new GenericConfigProvider('flowise', 'Flowise', flowiseConfig, 'llm', 'https://docs.flowiseai.com/installation/overview', 'Use the Flowise REST endpoint and API key configured in your Flowise instance.'));
  providerRegistry.register(new GenericConfigProvider('ollama', 'Ollama', ollamaConfig, 'llm', 'https://ollama.ai', 'Use the Ollama endpoint.'));
  providerRegistry.register(new GenericConfigProvider('openwebui', 'OpenWebUI', openWebUIConfig, 'llm', 'https://docs.openwebui.com/', 'Enable API access in OpenWebUI and copy the token from the administration panel.'));

  providerRegistry.register(new GenericConfigProvider('webhook', 'Webhook', webhookConfig, 'other'));
  providerRegistry.register(new GenericConfigProvider('message', 'Message', messageConfig, 'other'));
  providerRegistry.register(new GenericConfigProvider('llm', 'LLM', llmConfig, 'other'));

  providerRegistry.register(new SwarmInstallerProvider());
}
