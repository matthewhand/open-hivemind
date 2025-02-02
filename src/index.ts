require('dotenv/config');
import 'module-alias/register';
import path from 'path';
import moduleAlias from 'module-alias';
import debug from 'debug';
import { DiscordService } from '@integrations/discord/DiscordService';
import { handleMessage } from '@message/handlers/messageHandler';
import { IMessengerService } from '@message/interfaces/IMessengerService';
import { webhookService } from '@webhook/webhookService';
const { debugEnvVars } = require('@config/debugEnvVars');
import llmConfig from '@llm/interfaces/llmConfig';
import messageConfig from '@message/interfaces/messageConfig';
import discordConfig from '@integrations/discord/interfaces/discordConfig';
import express from 'express';
import healthRoute from './routes/health';

// ✅ Explicitly define aliases to ensure runtime resolution
moduleAlias.addAliases({
  '@src': path.resolve(__dirname, '../src'),
  '@integrations': path.resolve(__dirname, '../src/integrations'),
  '@message': path.resolve(__dirname, '../src/message'),
  '@llm': path.resolve(__dirname, '../src/llm'),
  '@config': path.resolve(__dirname, '../src/config'),
  '@command': path.resolve(__dirname, '../src/command'),
  '@common': path.resolve(__dirname, '../src/common'),
  '@webhook': path.resolve(__dirname, '../src/webhook'),
  '@types': path.resolve(__dirname, '../src/types'),
});

const log = debug('app:index');
const app = express();
app.use(healthRoute);

async function startBot(messengerService: IMessengerService) {
  try {
    debugEnvVars();
    messengerService.setMessageHandler(handleMessage);
    log('[DEBUG] Message handler set up successfully.');
  } catch (error) {
    log('Error starting bot service:', error);
  }
}

async function main() {
  console.log('LLM Provider in use:', llmConfig.get('LLM_PROVIDER') || 'Default OpenAI');
  console.log('Message Provider in use:', messageConfig.get('MESSAGE_PROVIDER') || 'Default Message Service');

  const messengerService = DiscordService.getInstance();
  await startBot(messengerService);
  
  const port = process.env.PORT || 5005;
  app.listen(port, () => {
    console.log('Server is listening on port ' + port);
  });

  const isWebhookEnabled = messageConfig.get('MESSAGE_WEBHOOK_ENABLED') || false;
  if (isWebhookEnabled) {
    console.log('Webhook service is enabled, registering routes...');
    const channelId = discordConfig.get('DISCORD_CHANNEL_ID') || '';
    const bonuses: Record<string, number> = discordConfig.get('DISCORD_CHANNEL_BONUSES') || {};
    const globalModifier = discordConfig.get('DISCORD_UNSOLICITED_CHANCE_MODIFIER') || 1.0;
    const bonus = bonuses[channelId] ?? globalModifier;
    console.log('Using bonus: ' + bonus + ' for channel: ' + channelId);
    await webhookService.start(app, messengerService, channelId);
  } else {
    console.log('Webhook service is disabled.');
  }
}

main().catch((error) => {
  console.error('[DEBUG] Unexpected error in main execution:', error);
  process.exit(1);
});
