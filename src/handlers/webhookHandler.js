const axios = require('axios');
const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { predictionImageMap } = require('../utils/handleImageMessage');
const constants = require('./config/constants'); // Adjust path as necessary
const DiscordManager = require('./managers/DiscordManager');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

if (!process.env.DISCORD_TOKEN || !process.env.CHANNEL_ID || !process.env.REPLICATE_TOKEN) {
    console.error('Missing required environment variables: DISCORD_TOKEN and/or CHANNEL_ID and/or REPLICATE_TOKEN');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('Failed to login to Discord:', error.message);
    process.exit(1);
});

async function getPredictionResult(predictionId) {
    try {
        const response = await axios.get(
            `https://api.replicate.com/v1/predictions/${predictionId}`,
            {
                headers: {
                    'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
                }
             }
        );
        return response.data;
    } catch (error) {
        console.error('Failed to get prediction result:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get prediction result');
    }
}

const startWebhookServer = (port) => {
    const app = express();
    app.use(express.json());

    app.post('/webhook', async (req, res) => {
        console.log('Received webhook:', req.body);

        const predictionId = req.body.id;
        const predictionResult = req.body;  // Adjust this line if necessary to obtain the prediction result
        const imageUrl = predictionImageMap.get(predictionId); // Retrieve the image URL using the prediction ID

        const channelId = process.env.CHANNEL_ID;
        const channel = client.channels.cache.get(channelId);

        if (channel) {
            let resultMessage;
            if (predictionResult.status === 'succeeded') {
                const resultArray = predictionResult.output;
                const resultText = resultArray.join(' ');  // Join array elements into a single string
                // Include the image URL in the result message
                resultMessage = `${resultText}`;
            } else if (predictionResult.status === 'processing') {
                console.debug(`Processing: ${predictionId}`);
            } else {
                resultMessage = `Prediction ID: ${predictionId}\nStatus: ${predictionResult.status}`;
            }

            await channel.send(resultMessage).catch(error => {
                console.error('Failed to send message to channel:', error.message);
            });

            // Remove the image URL from the map after sending the message
            predictionImageMap.delete(predictionId);
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

    app.post('/receive-message', async (req, res) => {
        const { message } = req.body; // Assuming the body directly contains the message text
    
        try {
            // Use DiscordManager to get the existing client instance
            const discordManager = DiscordManager.getInstance();
    
            // Use the channel ID from your constants to send the message
            const channel = await discordManager.client.channels.fetch(constants.CHANNEL_ID);
    
            // Send the message to the specified channel
            await channel.send(message);
    
            res.status(200).send("Message posted successfully.");
        } catch (error) {
            console.error('Error posting the received message:', error);
            res.status(500).send({ error: 'Failed to post the received message' });
        }
    });

};

client.once('ready', () => {
    console.log('Logged in as', client.user.tag);

    const port = process.env.WEB_SERVER_PORT || 3001;
    startWebhookServer(port);
});

module.exports = {
    startWebhookServer,
};

