const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID) {
    console.error('Missing required environment variables: DISCORD_TOKEN and/or CHANNEL_ID');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error.message);
    process.exit(1);
});

const startWebhookServer = (port) => {
    const app = express();
    app.use(express.json());

    app.post('/webhook', (req, res) => {
        console.log('Received webhook:', req.body);

        const predictionResult = req.body;
        const channelId = process.env.CHANNEL_ID;
        const channel = client.channels.cache.get(channelId);

        if (channel) {
            const resultMessage = `Prediction Result: ${JSON.stringify(predictionResult, null, 2)}`;
            channel.send(resultMessage).catch(error => {
                console.error('Failed to send message to channel:', error.message);
            });
        } else {
            console.error('Channel not found');
        }

        res.setHeader('Content-Type', 'application/json');
        res.sendStatus(200);
    });

    app.get('/health', (req, res) => {
        console.debug('Received health probe');
        res.sendStatus(200);
    });

    app.get('/uptime', (req, res) => {
        console.debug('Received uptime probe');
        res.sendStatus(200);
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error('Unhandled Error:', err.message);
        res.status(500).send({ error: 'Server Error' });
    });

    app.listen(port, () => {
        console.log(`HTTP server listening at http://localhost:${port}`);
    });
};

client.once('ready', () => {
    console.log('Logged in as', client.user.tag);

    const port = process.env.PORT || 3000;
    startWebhookServer(port);
});

module.exports = {
    startWebhookServer,
};
