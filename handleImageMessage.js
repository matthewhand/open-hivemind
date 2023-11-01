// Importing necessary libraries and modules
import fetch from 'node-fetch';
import Replicate from 'replicate';
import { Client, Intents } from 'discord.js';

// Initializing Discord client and Replicate
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.MESSAGE_CONTENT,
  ],
});
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Handling image message
async function handleImageMessage(message, replicate) {
  try {
    const attachments = message.attachments;
    if (attachments.size > 0) {
      const imageUrl = attachments.first().url;
      console.debug(`Image URL: ${imageUrl}`);
      // Checking content before sending
      const content = 'Image detected. Running analysis using Llava 13b on Replicant...';
      if (content) {
        await message.channel.send(content);
      } else {
        console.error('Message content is undefined');
      }
      const modelVersion = process.env.MODEL_VERSION || "yorickvp/llava-13b:2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591";
      const prediction = await replicate.predictions.create({
        version: modelVersion,
        input: { image: imageUrl },
        webhook: process.env.WEBHOOK_URL,
        webhook_events_filter: ['completed'],
      });
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
  await handleImageMessage(message, replicate);
});

// Logging in to Discord
client.login(process.env.DISCORD_TOKEN);
