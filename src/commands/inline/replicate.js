const axios = require('axios');
const ICommand = require('../../interfaces/ICommand');
const logger = require('../../utils/logger');
const { getRandomErrorMessage } = require('../../config/errorMessages');

class ReplicateCommand extends ICommand {
    constructor() {
        super();
        this.name = 'replicate';
        this.description = 'Analyzes an image using a specified AI model. Usage: !replicate [prompt]';
    }

    async execute(args) {
        const message = args.message;
        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first().url;
            const prompt = args.join(' ') || process.env.IMAGE_PROMPT || 'Please describe this image';

            logger.debug(`ReplicateCommand: Sending image analysis request for ${imageUrl}`);
            try {
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

                if (response.status === 200 && response.data.success) {
                    logger.info(`ReplicateCommand: Image analysis successful for ${imageUrl}. Prediction ID: ${response.data.id}`);
                    return { success: true, message: `Image analysis successful. Prediction ID: ${response.data.id}`, url: response.data.urls.show };
                } else {
                    logger.error(`ReplicateCommand: Failed API call with status ${response.status}`);
                    return { success: false, message: "Failed to initiate image analysis." };
                }
            } catch (error) {
                logger.error(`ReplicateCommand: Error during API call - ${error.message}`);
                return { success: false, message: getRandomErrorMessage(), error: error.message };
            }
        } else {
            logger.warn('ReplicateCommand: No image attached for analysis.');
            return { success: false, message: 'Please attach an image to analyze.' };
        }
    }
}

module.exports = ReplicateCommand;  // Correctly exporting the class for dynamic instantiation
