import { ProviderRegistry } from './ProviderRegistry';
import { SlackService } from '@hivemind/adapter-slack';
import messageConfig from '../config/messageConfig';
import llmConfig from '../config/llmConfig';
import discordConfig from '../config/discordConfig';
import slackConfig from '../config/slackConfig';
import openaiConfig from '../config/openaiConfig';
import flowiseConfig from '../config/flowiseConfig';
import ollamaConfig from '../config/ollamaConfig';
import mattermostConfig from '../config/mattermostConfig';
import openWebUIConfig from '../config/openWebUIConfig';
import webhookConfig from '../config/webhookConfig';
import { SwarmInstaller } from '@src/integrations/openswarm/SwarmInstaller';
import { IProvider } from '@hivemind/shared-types';

export function registerProviders() {
  const registry = ProviderRegistry.getInstance();

  // 1. Message Provider
  registry.registerMetadata({
    id: 'message',
    name: 'Messaging Settings',
    type: 'other',
    configSchema: messageConfig.getSchema()
  });

  // 2. LLM Provider (Global settings)
  registry.registerMetadata({
    id: 'llm',
    name: 'LLM Settings',
    type: 'other',
    configSchema: llmConfig.getSchema()
  });

  // 3. Slack
  try {
    const slack = SlackService.getInstance();
    const meta = slack.getMetadata();
    // Merge schema
    meta.configSchema = slackConfig.getSchema();
    registry.registerMetadata(meta);
    registry.registerInstance(slack);
  } catch (e) {
    // Fallback if singleton fails (shouldn't happen usually)
    registry.registerMetadata({
        id: 'slack',
        name: 'Slack',
        type: 'messenger',
        docsUrl: 'https://api.slack.com/apps',
        helpText: 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.',
        sensitiveFields: ['token', 'secret', 'password'],
        configSchema: slackConfig.getSchema()
    });
  }

  // 4. Discord
  registry.registerMetadata({
    id: 'discord',
    name: 'Discord',
    type: 'messenger',
    docsUrl: 'https://discord.com/developers/applications',
    helpText: 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.',
    sensitiveFields: ['token', 'secret', 'password'],
    configSchema: discordConfig.getSchema()
  });

  // 5. OpenAI
  registry.registerMetadata({
    id: 'openai',
    name: 'OpenAI',
    type: 'llm',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    helpText: 'Create an OpenAI API key from the developer dashboard and paste it here.',
    sensitiveFields: ['apiKey'],
    configSchema: openaiConfig.getSchema()
  });

  // 6. Flowise
  registry.registerMetadata({
    id: 'flowise',
    name: 'Flowise',
    type: 'llm',
    docsUrl: 'https://docs.flowiseai.com/installation/overview',
    helpText: 'Use the Flowise REST endpoint and API key configured in your Flowise instance.',
    sensitiveFields: ['apiKey'],
    configSchema: flowiseConfig.getSchema()
  });

  // 7. Ollama
  registry.registerMetadata({
    id: 'ollama',
    name: 'Ollama',
    type: 'llm',
    configSchema: ollamaConfig.getSchema()
  });

  // 8. Mattermost
  registry.registerMetadata({
    id: 'mattermost',
    name: 'Mattermost',
    type: 'messenger',
    docsUrl: 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
    helpText: 'Create a Mattermost bot account and generate a personal access token for it.',
    sensitiveFields: ['token'],
    configSchema: mattermostConfig.getSchema()
  });

  // 9. OpenWebUI
  registry.registerMetadata({
    id: 'openwebui',
    name: 'OpenWebUI',
    type: 'llm',
    docsUrl: 'https://docs.openwebui.com/',
    helpText: 'Enable API access in OpenWebUI and copy the token from the administration panel.',
    sensitiveFields: ['apiKey'],
    configSchema: openWebUIConfig.getSchema()
  });

  // 10. Webhook
  registry.registerMetadata({
    id: 'webhook',
    name: 'Webhook',
    type: 'other',
    configSchema: webhookConfig.getSchema()
  });

  // 11. OpenSwarm
  const swarm = new SwarmInstaller();
  registry.registerMetadata(swarm.getMetadata());
  registry.registerInstance(swarm);
}
