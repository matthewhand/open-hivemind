// Importing necessary libraries and modules
const axios = require('axios');

// This map will store the association between prediction IDs and image URLs
const predictionImageMap = new Map();

// Function to create prediction via Replicate's REST API
async function createPrediction(imageUrl, prompt = 'Please describe this image', model = '2facb4a474a0462c15041b78b1ad70952ea46b5ec6ad29583c0b29dbd4249591') {
  try {
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: model,
        input: { 
          image: imageUrl,
          prompt: prompt
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

    // Store the image URL with the associated prediction ID
    predictionImageMap.set(response.data.id, imageUrl);

    return response.data;
  } catch (error) {
    console.error('Failed to create prediction:', error.response ? error.response.data : error.message);
    throw new Error('Failed to create prediction');
  }
}

// Handling image message
async function handleImageMessage(message, prompt) {
  try {

    if (message.channel.id !== process.env.CHANNEL_ID) {
      console.debug(`Ignoring message in channel ${message.channel.id}`);
      return false;
    }

    const attachments = message.attachments;
    if (attachments.size > 0) {
      const imageUrl = attachments.first().url;
      console.debug(`Image URL: ${imageUrl}`);

      const prediction = await createPrediction(imageUrl, prompt);
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

// Exporting the function and the map
module.exports = { handleImageMessage, predictionImageMap };
