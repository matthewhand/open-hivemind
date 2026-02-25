import { ProviderRegistry } from './ProviderRegistry';
import { SwarmInstaller } from '@src/integrations/openswarm/SwarmInstaller';
import { ConfigProvider } from '@src/providers/ConfigProvider';

// Import configs
import messageConfig from '@config/messageConfig';
import llmConfig from '@config/llmConfig';
import discordConfig from '@config/discordConfig';
import slackConfig from '@config/slackConfig';
import openaiConfig from '@config/openaiConfig';
import flowiseConfig from '@config/flowiseConfig';
import ollamaConfig from '@config/ollamaConfig';
import mattermostConfig from '@config/mattermostConfig';
import openWebUIConfig from '@config/openWebUIConfig';
import webhookConfig from '@config/webhookConfig';

export function registerStaticProviders() {
  const registry = ProviderRegistry.getInstance();

  try {
    // Base Configs
    registry.register(
      new ConfigProvider('message', 'Messaging Settings', messageConfig, 'config')
    );
    registry.register(new ConfigProvider('llm', 'LLM Settings', llmConfig, 'config'));

    // Messenger Configs (will be overwritten by Services if they start)
    registry.register(
      new ConfigProvider(
        'slack',
        'Slack',
        slackConfig,
        'messenger',
        'https://api.slack.com/apps',
        'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.'
      )
    );
    registry.register(
      new ConfigProvider(
        'discord',
        'Discord',
        discordConfig,
        'messenger',
        'https://discord.com/developers/applications',
        'Create a Discord application, add a bot, and copy the bot token.'
      )
    );
    registry.register(
      new ConfigProvider(
        'mattermost',
        'Mattermost',
        mattermostConfig,
        'messenger',
        'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
        'Create a Mattermost bot account and generate a personal access token for it.'
      )
    );

    // LLM Configs
    registry.register(
      new ConfigProvider(
        'openai',
        'OpenAI',
        openaiConfig,
        'llm',
        'https://platform.openai.com/account/api-keys',
        'Create an OpenAI API key from the developer dashboard and paste it here.'
      )
    );
    registry.register(
      new ConfigProvider(
        'flowise',
        'Flowise',
        flowiseConfig,
        'llm',
        'https://docs.flowiseai.com/installation/overview',
        'Use the Flowise REST endpoint and API key configured in your Flowise instance.'
      )
    );
    registry.register(new ConfigProvider('ollama', 'Ollama', ollamaConfig, 'llm'));
    registry.register(
      new ConfigProvider(
        'openwebui',
        'OpenWebUI',
        openWebUIConfig,
        'llm',
        'https://docs.openwebui.com/',
        'Enable API access in OpenWebUI and copy the token from the administration panel.'
      )
    );

    // Other Configs
    registry.register(new ConfigProvider('webhook', 'Webhook', webhookConfig, 'other'));

    // Tool Installers
    registry.register(new SwarmInstaller());
  } catch (e) {
    console.error('Error registering static providers:', e);
  }
}
