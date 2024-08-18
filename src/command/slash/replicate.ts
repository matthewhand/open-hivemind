import axios from 'axios';
import { BaseCommand } from '../types/BaseCommand';
import logger from '../../logging/logger';
import { Message } from 'discord.js';
import { getRandomErrorMessage } from '../../common/errors/errorMessages';

export class ReplicateCommand extends BaseCommand {
    constructor() {
        super('replicate', 'Analyzes an image using a specified AI model. Usage: !replicate [prompt]');
    }

    async execute(args: { message: Message, args: string[] }): Promise<{ success: boolean, message: string, url?: string, error?: string }> {
        const { message } = args;
        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first()?.url;
            const prompt = args.args.join(' ') || process.env.IMAGE_PROMPT || 'Please describe this image';

            logger.debug('ReplicateCommand: Sending image analysis request for ' + imageUrl);
            try {
                const response = await axios.post(
                    'https://api.replicate.com/v1/predictions',
                    {
                        version: process.env.MODEL_VERSION || 'default-model-version',
                        input: { image: imageUrl, prompt: prompt },
                        webhook: process.env.WEBHOOK_URL,
                        webhook_events_filter: ['start', 'completed']
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Token ' + process.env.REPLICATE_API_TOKEN
                        }
                    }
                );

                if (response.status === 200 && response.data.success) {
                    logger.info('ReplicateCommand: Image analysis successful for ' + imageUrl + '. Prediction ID: ' + response.data.id);
                    return { success: true, message: 'Image analysis successful. Prediction ID: ' + response.data.id, url: response.data.urls.show };
                } else {
                    logger.error('ReplicateCommand: Failed API call with status ' + response.status);
                    return { success: false, message: 'Failed to initiate image analysis.' };
                }
            } catch (error: any) {
                logger.error('ReplicateCommand: Error during API call - ' + error.message);
                return { success: false, message: getRandomErrorMessage(), error: error.message };
            }
        } else {
            logger.warn('ReplicateCommand: No image attached for analysis.');
            return { success: false, message: 'Please attach an image to analyze.' };
        }
    }
}
