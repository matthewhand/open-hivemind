import express, { Request, Response, NextFunction } from 'express';
import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { predictionImageMap } from '../message/helpers/handleImageMessage';
import { DiscordService } from '@src/message/discord/DiscordService';
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID) {
    debug('Missing required environment variables: DISCORD_TOKEN and/or CHANNEL_ID');
    process.exit(1);
}
client.login(process.env.DISCORD_TOKEN).catch(error => {
    debug('Failed to login to Discord:'  error.message);
    process.exit(1);
});
/**
 * Starts the webhook server and defines its routes and handlers.
 * 
 * @param port - The port on which the server will listen.
 */
export const startWebhookServer = (port: number): void => {
    const app = express();
    app.use(express.json());
    app.post('/webhook', async (req: Request, res: Response) => {
        debug('Received webhook:'  req.body);
        const predictionId = req.body.id;
        const predictionResult = req.body;
        const imageUrl = predictionImageMap.get(predictionId);
        debug.debug('Image URL: ' + imageUrl);
        const channelId = process.env.CHANNEL_ID!;
        const channel = client.channels?.cache.get(channelId) as TextChannel;
        if (channel) {
            let resultMessage: string;
            if (predictionResult.status === 'succeeded') {
                const resultArray = predictionResult.output;
                const resultText = resultArray.join(' ');
                resultMessage = resultText + '\nImage URL: ' + imageUrl;
            } else if (predictionResult.status === 'processing') {
                debug.debug('Processing: ' + predictionId);
                return res.sendStatus(200);
            } else {
                resultMessage = 'Prediction ID: ' + predictionId + '\nStatus: ' + predictionResult.status;
            }
            await channel.send(resultMessage).catch(error => {
                debug('Failed to send message to channel:'  error.message);
            });
            predictionImageMap.delete(predictionId);
        } else {
            debug('Channel not found');
        }
        res.setHeader('Content-Type', 'application/json');
        res.sendStatus(200);
    });
    app.get('/health', (req: Request, res: Response) => {
        debug.debug('Received health probe');
        res.sendStatus(200);
    });
    app.get('/uptime', (req: Request, res: Response) => {
        debug.debug('Received uptime probe');
        res.sendStatus(200);
    });
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        debug('Unhandled Error:'  err.message);
        debug.debug('Next middleware function: ' + next);
        res.status(500).send({ error: 'Server Error' });
    });
    app.listen(port, () => {
        debug('HTTP server listening at http://localhost:' + port);
    });
    app.post('/post', async (req: Request, res: Response) => {
        const { message } = req.body;
        if (!message) {
            debug('No message provided in request body');
            return res.status(400).send({ error: 'Message is required' });
        }
        try {
            await DiscordService.getInstance().sendMessageToChannel(process.env.CHANNEL_ID!, message);
            debug.debug('Message sent to Discord: ' + message);
            res.status(200).send({ message: 'Message sent to Discord.' });
        } catch (error: any) {
            debug('Failed to send the message:'  error);
            res.status(500).send({ error: 'Failed to send the message' });
        }
    });
    // app.post('/summarise-then-post', async (req: Request, res: Response) => {
    //     const { message } = req.body;
    //     const openAiManager = new OpenAI({ apiKey: constants.LLM_API_KEY, baseURL: constants.LLM_ENDPOINT_URL });
    //     if (!message) {
    //         debug('No message provided in request body');
    //         return res.status(400).send({ error: 'Message is required' });
    //     }
    //     try {
    //         debug.debug('Received message for summarization: ' + message);
    //         const summarizedTexts = await summarizeMessage(message);
    //         const summarizedMessage = summarizedTexts.length > 0 ? summarizedTexts[0] : '';
    //         if (!summarizedMessage) {
    //             debug('Summarized message is empty');
    //             return res.status(500).send({ error: 'Failed to summarize the message' });
    //         }
    //         await DiscordService.getInstance().sendMessageToChannel(process.env.CHANNEL_ID!, summarizedMessage);
    //         debug.debug('Summarized message sent to Discord: ' + summarizedMessage);
    //         res.status(200).send({ message: 'Message summarized and sent to Discord.' });
    //     } catch (error: any) {
    //         debug('Failed to summarize or send the message:'  error);
    //         res.status(500).send({ error: 'Failed to summarize or send the message' });
    //     }
    // });
};
client.once('ready', () => {
    debug('Logged in as ' + client.user!.tag);
    const port = Number(process.env.WEB_SERVER_PORT) || 3001;
    startWebhookServer(port);
});
