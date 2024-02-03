const axios = require('axios');
const logger = require('../utils/logger');

const data = {
    name: 'image',
    description: 'Analyzes an image using a specified AI model. Usage: !image [prompt]'
};

async function execute(message) {
    const attachments = message.attachments;
    if (attachments.size > 0) {
        const imageUrl = attachments.first().url;
        const prompt = message.content.split(' ').slice(1).join(' ') || process.env.IMAGE_PROMPT || 'Please describe this image';

        try {
            logger.debug(`Sending image analysis request for ${imageUrl}`);
            const response = await axios.post(
                'https://api.replicate.com/v1/predictions',
                {
                    version: process.env.MODEL_VERSION || "default-model-version",
                    input: { image: imageUrl, prompt: prompt },
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

            logger.info(`Image analysis initiated for ${imageUrl}. Prediction ID: ${response.data.id}`);
            message.reply(`Image analysis initiated. Prediction ID: ${response.data.id}`);
        } catch (error) {
            logger.error(`Error in execute function of image analysis: ${error.message}`);
            message.reply(`An error occurred while analyzing the image: ${error.message}`);
        }
    } else {
        logger.warn('No image attached for analysis.');
        message.reply('Please attach an image to analyze.');
    }
}

module.exports = { data, execute };
