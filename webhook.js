const express = require('express');
const { Client, Intents } = require('discord.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.MESSAGE_CONTENT
    ]
});
client.login(process.env.DISCORD_TOKEN);  // Login to Discord

// Ensure Discord client is ready before starting the webhook server
client.once('ready', () => {
    console.log('Logged in as', client.user.tag);

    const startWebhookServer = (port) => {
        const app = express();
        app.use(express.json());

        app.post('/webhook', (req, res) => {
            // Handle incoming webhook from Replicate
            console.log('Received webhook:', req.body);

            const predictionResult = req.body;
            const channelId = process.env.CHANNEL_ID;  // Assuming you have a specific channel to post the result
            const channel = client.channels.cache.get(channelId);

            if (channel) {
                const resultMessage = `Prediction Result: ${JSON.stringify(predictionResult, null, 2)}`;
                channel.send(resultMessage);
            } else {
                console.error('Channel not found');
            }

            res.sendStatus(200);
        });

        app.get('/health', (req, res) => {
            // Handle incoming webhook
            console.debug('Received health probe');
            res.sendStatus(200);
        });

        app.get('/uptime', (req, res) => {
            // Handle incoming webhook
            console.debug('Received uptime probe');
            res.sendStatus(200);
        });

        app.listen(port, () => {
            console.log(`HTTP server listening at http://localhost:${port}`);
        });
    };

    // Set the port either from the environment variable or default to 3000
    const port = process.env.PORT || 3000;
    startWebhookServer(port);
});
