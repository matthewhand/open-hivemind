import { Request, Response } from 'express';
import discordConfig from './interfaces/discordConfig'; // Using correct discordConfig
import { configureWebhookRoutes } from './routes/webhookRoutes';
import express from 'express';
import { Client } from 'discord.js';
import { verifyWebhookToken, verifyIpWhitelist } from './security/webhookSecurity';

// Initialize Discord client
const client = new Client({ intents: [] });

// Handle webhook requests
export const handleWebhook = (req: Request, res: Response): void => {
    const botToken = discordConfig.get<string>('DISCORD_BOT_TOKEN');
    const chatChannelId = discordConfig.get<string>('DISCORD_CHAT_CHANNEL_ID');

    if (!botToken || !chatChannelId) {
        res.status(400).send('Invalid configuration');
        return;
    }

    // Create Express app and configure routes
    const app = express();
    app.use(express.json());

    // Apply security middleware
    app.use(verifyWebhookToken);
    app.use(verifyIpWhitelist);

    configureWebhookRoutes(app, client, chatChannelId);

    // Process webhook payload
    const { body } = req;
    console.log('Received webhook data:', body);
    res.status(200).send('Webhook received');
};
