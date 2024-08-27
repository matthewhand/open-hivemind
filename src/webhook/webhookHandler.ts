import Debug from "debug";
import express, { Request, Response, NextFunction } from 'express';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { predictionImageMap } from '@src/message/helpers/processing/handleImageMessage';
import { DiscordService } from '@src/integrations/discord/DiscordService';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

const debug = Debug('app:webhookHandler');

// Initialize Discord client with necessary intents
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Retrieve required configurations from ConfigurationManager
const DISCORD_TOKEN = ConfigurationManager.DISCORD_CLIENT_ID;
const DISCORD_DEFAULT_CHANNEL_ID = ConfigurationManager.DISCORD_DEFAULT_CHANNEL_ID;

// Ensure necessary configurations are present
if (!DISCORD_TOKEN || !DISCORD_DEFAULT_CHANNEL_ID) {
  debug('Missing required configurations: DISCORD_TOKEN and/or DISCORD_DEFAULT_CHANNEL_ID');
  process.exit(1);
}

// Log in to Discord with the token
client.login(DISCORD_TOKEN).catch(error => {
  debug('Failed to login to Discord:', error.message);
  process.exit(1);
});

/**
 * Starts the webhook server and defines its routes and handlers.
 * 
 * This server listens for webhook events and processes them accordingly.
 * It integrates with Discord channels to send notifications based on webhook data.
 *
 * @param port - The port on which the server will listen.
 */
export const startWebhookServer = (port: number): void => {
  const app = express();
  app.use(express.json());

  // Webhook route to handle predictions and send results to Discord
  app.post('/webhook', async (req: Request, res: Response) => {
    debug('Received webhook:', JSON.stringify(req.body));
    const predictionId = req.body.id;
    const predictionStatus = req.body.status;
    const resultArray = req.body.output;
    const imageUrl = predictionImageMap.get(predictionId);
    debug('Image URL:', imageUrl);

    const channel = client.channels.cache.get(DISCORD_DEFAULT_CHANNEL_ID) as TextChannel;

    if (channel) {
      let resultMessage: string;

      if (predictionStatus === 'succeeded') {
        const resultText = resultArray.join(' ');
        resultMessage = resultText + '\nImage URL: ' + imageUrl;
      } else if (predictionStatus === 'processing') {
        debug('Processing:', predictionId);
        return res.sendStatus(200);
      } else {
        resultMessage = 'Prediction ID: ' + predictionId + '\nStatus: ' + predictionStatus;
      }

      await channel.send(resultMessage).catch(error => {
        debug('Failed to send message to channel:', error.message);
      });

      predictionImageMap.delete(predictionId);
    } else {
      debug('Channel not found for ID:', DISCORD_DEFAULT_CHANNEL_ID);
    }

    res.setHeader('Content-Type', 'application/json');
    res.sendStatus(200);
  });

  // Health check route
  app.get('/health', (req: Request, res: Response) => {
    debug('Health check received');
    res.sendStatus(200);
  });

  // Uptime check route
  app.get('/uptime', (req: Request, res: Response) => {
    debug('Uptime check received');
    res.sendStatus(200);
  });

  // Error handling middleware to catch unhandled errors
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    debug('Unhandled Error:', err.message);
    res.status(500).send({ error: 'Server Error' });
  });

  // Start the server and listen on the specified port
  app.listen(port, () => {
    debug('HTTP server listening at http://localhost:' + port);
  });

  // POST route to send messages to Discord channels
  app.post('/post', async (req: Request, res: Response) => {
    const message = req.body.message;

    if (!message) {
      debug('No message provided in request body');
      return res.status(400).send({ error: 'Message is required' });
    }

    try {
      await DiscordService.getInstance().sendMessageToChannel(DISCORD_DEFAULT_CHANNEL_ID, message);
      debug('Message sent to Discord:', message);
      res.status(200).send({ message: 'Message sent to Discord.' });
    } catch (error: any) {
      debug('Failed to send the message:', error.message);
      res.status(500).send({ error: 'Failed to send the message' });
    }
  });
};

// Start the webhook server once the Discord client is ready
client.once('ready', () => {
  debug('Logged in as ' + client.user!.tag);
  const port = Number(process.env.WEB_SERVER_PORT) || 3001;
  startWebhookServer(port);
});
