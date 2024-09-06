import Debug from 'debug';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import discordConfig from '@src/message/config/messageConfig';
import { configureWebhookRoutes } from './routes/webhookRoutes';

const debug = Debug('app:webhookHandler');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const DISCORD_TOKEN = discordConfig.get<string>('DISCORD_BOT_TOKEN');
const DISCORD_CHAT_CHANNEL_ID = discordConfig.get<string>('DISCORD_CHAT_CHANNEL_ID');

if (!DISCORD_TOKEN || !DISCORD_CHAT_CHANNEL_ID) {
  debug('Missing required configurations:', { DISCORD_TOKEN, DISCORD_CHAT_CHANNEL_ID });
  process.exit(1);
}

client.login(DISCORD_TOKEN).catch(error => {
  debug('Failed to login to Discord:', error.message);
  process.exit(1);
});

export const startWebhookServer = (port: number): void => {
  const app = express();
  app.use(express.json());
  configureWebhookRoutes(app, client, DISCORD_CHAT_CHANNEL_ID);

  app.listen(port, () => {
    debug('HTTP server listening at http://localhost:' + port);
  });
};

client.once('ready', () => {
  debug('Logged in as ' + client.user!.tag);
  const port = Number(process.env.WEB_SERVER_PORT) || 3001;
  startWebhookServer(port);
});
