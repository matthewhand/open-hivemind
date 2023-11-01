// Importing necessary libraries and modules
const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');

// Initializing Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Function to create prediction via Replicate's REST API
async function createPrediction(imageUrl) {
  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: process.env.MODEL_VERSION || "2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591", // https://replicate.com/yorickvp/llava-13b/api
        input: { 
          image: imageUrl,
          prompt: process.env.IMAGE_PROMPT || 'Please describe this image'
        },
        webhook: process.env.WEBHOOK_URL,
        webhook_events_filter: ["start", "completed"]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to create prediction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create prediction');
  }
}

// Handling image message
async function handleImageMessage(message) {
  try {
    const attachments = message.attachments;
    if (attachments.size > 0) {
      const imageUrl = attachments.first().url;
      console.debug(`Image URL: ${imageUrl}`);
      const content = 'Image detected. Running analysis using Llava 13b on replicate.com...';
      await message.channel.send(content);

      const prediction = await createPrediction(imageUrl);
      const predictionId = prediction.id;
      console.log(`Prediction ID: ${predictionId}`);
      return true;
    } else {
      console.debug('No attachments found');
      return false;
    }
  } catch (error) {
    console.error(`Error in handleImageMessage: ${error.message}`);
    return false;
  }
}

// Exporting the function
module.exports = { handleImageMessage };

// Client ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// Message create event
client.on('messageCreate', async (message) => {
  // Ignoring messages from bots
  if (message.author.bot) return;
  await handleImageMessage(message);
});

// Logging in to Discord
client.login(process.env.DISCORD_TOKEN);