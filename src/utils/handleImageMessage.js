const axios = require('axios');

// This map will store the association between prediction IDs and image URLs
const predictionImageMap = new Map();

// Function to create prediction via Replicate's REST API
async function createPrediction(imageUrl) {
    try {
        const postData = {
            version: process.env.REPLICATE_MODEL_VERSION || "default-model-version",
            input: {
                image: imageUrl,
                prompt: process.env.REPLICATE_DEFAULT_PROMPT || 'Please describe this image'
            }
        };

        if (!process.env.REPLICATE_WEBHOOK_URL) {
            postData["sync"] = true;  // Wait synchronously for the prediction
        } else {
            postData["webhook"] = process.env.REPLICATE_WEBHOOK_URL;
            postData["webhook_events_filter"] = ["start", "completed"];
        }

        const response = await axios.post(
            'https://api.replicate.com/v1/predictions',
            postData,
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
        if (message.channel.id !== process.env.CHANNEL_ID) {
            console.debug(`Ignoring message in channel ${message.channel.id}`);
            return false;
        }

        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first().url;
            console.debug(`Image URL: ${imageUrl}`);

            const prediction = await createPrediction(imageUrl);
            if (!process.env.REPLICATE_WEBHOOK_URL) {
                // Handle synchronous prediction result
                // Send the result to the user
                // Adjust based on the structure of prediction response
                message.reply(`Prediction result: ${JSON.stringify(prediction)}`);
            } else {
                // Handle asynchronous prediction (via webhook)
                const predictionId = prediction.id;
                console.log(`Prediction ID: ${predictionId}`);
                // Store the image URL with the associated prediction ID
                predictionImageMap.set(predictionId, imageUrl);
            }
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
