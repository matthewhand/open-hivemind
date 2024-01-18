const axios = require('axios');

async function handleImageAnalysis(message, args) {
    const attachments = message.attachments;
    if (attachments.size > 0) {
        const imageUrl = attachments.first().url;
        const prompt = args.trim() || process.env.IMAGE_PROMPT || 'Please describe this image';

        try {
            const response = await axios.post(
                'https://api.replicate.com/v1/predictions',
                {
                    version: process.env.MODEL_VERSION || "default-model-version",
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

            // Store the image URL with the associated prediction ID if needed
            // predictionImageMap.set(response.data.id, imageUrl);

            message.reply(`Image analysis initiated. Prediction ID: ${response.data.id}`);
        } catch (error) {
            console.error('Error in handleImageAnalysis:', error.response ? JSON.stringify(error.response.data) : error.message);
            message.reply('An error occurred while analyzing the image: ' + error.message);
        }
    } else {
        message.reply('Please attach an image to analyze.');
    }
}

module.exports = { handleImageAnalysis };

