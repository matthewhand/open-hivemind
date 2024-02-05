const axios = require('axios');
const logger = require('../../utils/logger');
const Command = require('../../utils/Command');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class ImageCommand extends Command {
    constructor() {
        super('image', 'Analyzes an image using a specified AI model. Usage: !image [prompt]');
    }

    async execute(message) {
        try {
            const attachments = message.attachments;
            if (attachments.size > 0) {
                const imageUrl = attachments.first().url;
                const prompt = message.content.split(' ').slice(1).join(' ') || process.env.IMAGE_PROMPT || 'Please describe this image';

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
            } else {
                logger.warn('No image attached for analysis.');
                message.reply('Please attach an image to analyze.');
            }
        } catch (error) {
            logger.error(`Error in ImageCommand execute: ${error}`);
            message.reply(getRandomErrorMessage());
        }
    }
}

module.exports = new ImageCommand();
