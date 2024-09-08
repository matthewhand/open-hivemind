import { Request, Response } from 'express';
import discordConfig from '@src/message/config/messageConfig';
import { configureWebhookRoutes } from './routes/webhookRoutes';
import express from 'express';
import { Client } from 'discord.js';
import { verifyWebhookToken, verifyIpWhitelist } from './security/webhookSecurity';

const client = new Client({ intents: [] });

export const handleWebhook = (req: Request, res: Response): void => {
    const botToken: string = discordConfig.get('DISCORD_BOT_TOKEN');
    const chatChannelId: string = discordConfig.get('DISCORD_CHAT_CHANNEL_ID');

    if (!botToken || !chatChannelId) {
        res.status(400).send('Invalid configuration');
        return;
    }

    const app = express();
    app.use(express.json());
    app.use(verifyWebhookToken);
    app.use(verifyIpWhitelist);

    configureWebhookRoutes(app, client, chatChannelId);

    const { body } = req;
    console.log('Received webhook data:', body);
    res.status(200).send('Webhook received');
};
