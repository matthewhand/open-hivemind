import axios from 'axios';
/**
 * A map that stores the association between prediction IDs and image URLs.
 */
export const predictionImageMap = new Map<string, string>();
/**
 * Creates a prediction via Replicate's REST API using the provided image URL.
 * 
 * @param imageUrl - The URL of the image to analyze.
 * @returns The prediction result from the API.
 */
export async function createPrediction(imageUrl: string): Promise<any> {
    try {
        const replicateCfg = require('@config/replicateConfig').default;
        const webhook = process.env.REPLICATE_WEBHOOK_URL; // tests expect env to control sync vs webhook
        const postData: Record<string, any> = {
            version: (replicateCfg.get('REPLICATE_MODEL_VERSION') as string) || 'default-model-version',
            input: {
                image: imageUrl,
                prompt: (replicateCfg.get('REPLICATE_DEFAULT_PROMPT') as string) || 'Please describe this image'
            }
        };
        if (!webhook) {
            postData.sync = true;  // Wait synchronously for the prediction
        } else {
            postData.webhook = webhook;
            postData.webhook_events_filter = ['start', 'completed'];
        }
        const response = await axios.post(
            'https://api.replicate.com/v1/predictions',
            postData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Token ' + (replicateCfg.get('REPLICATE_API_TOKEN') as string)
                }
            }
        );
        return response.data;
    } catch (error: any) {
        console.error('Failed to create prediction:', error.response ? error.response.data : error.message);
        throw new Error('Failed to create prediction');
    }
}
/**
 * Handles an image message by creating a prediction via Replicate's REST API.
 * 
 * @param message - The message object containing the image to analyze.
 * @returns A boolean indicating whether the message was processed.
 */
export async function handleImageMessage(message: any): Promise<boolean> {
    try {
        const chatChannel = process.env.DISCORD_CHAT_CHANNEL_ID as string;
        if (chatChannel && message.channel.id !== chatChannel) {
            console.debug('Ignoring message in channel ' + message.channel.id);
            return false;
        }
        const attachments = message.attachments;
        if (attachments.size > 0) {
            const imageUrl = attachments.first().url;
            console.debug('Image URL: ' + imageUrl);
            const prediction = await createPrediction(imageUrl);
            const webhook = process.env.REPLICATE_WEBHOOK_URL;
            if (!webhook) {
                // Handle synchronous prediction result
                message.reply('Prediction result: ' + JSON.stringify(prediction));
            } else {
                // Handle asynchronous prediction (via webhook)
                const predictionId = prediction.id;
                console.log('Prediction ID: ' + predictionId);
                predictionImageMap.set(predictionId, imageUrl);
            }
            return true;
        } else {
            console.debug('No attachments found');
            return false;
        }
    } catch (error: any) {
        console.error('Error in handleImageMessage: ' + error.message);
        return false;
    }
}
