import axios from 'axios';
import Debug from 'debug';
import { Logger } from '@common/logger';

const debug = Debug('app:message:helpers:processing:handleImageMessage');
const logger = Logger.withContext('handleImageMessage');

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
    const postData: Record<string, any> = {
      version: process.env.REPLICATE_MODEL_VERSION || 'default-model-version',
      input: {
        image: imageUrl,
        prompt: process.env.REPLICATE_DEFAULT_PROMPT || 'Please describe this image',
      },
    };
    if (!process.env.REPLICATE_WEBHOOK_URL) {
      postData.sync = true; // Wait synchronously for the prediction
    } else {
      postData.webhook = process.env.REPLICATE_WEBHOOK_URL;
      postData.webhook_events_filter = ['start', 'completed'];
    }
    const response = await axios.post('https://api.replicate.com/v1/predictions', postData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Token ' + process.env.REPLICATE_API_TOKEN,
      },
    });
    return response.data;
  } catch (error: any) {
    debug(
      'ERROR:',
      'Failed to create prediction:',
      error.response ? error.response.data : error.message
    );
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
    if (message.channel.id !== process.env.DISCORD_CHAT_CHANNEL_ID) {
      logger.debug('Ignoring message in channel', { channelId: message.channel.id });
      return false;
    }
    const attachments = message.attachments;
    if (attachments.size > 0) {
      const imageUrl = attachments.first().url;
      logger.debug('Image URL received', { imageUrl });
      const prediction = await createPrediction(imageUrl);
      if (!process.env.REPLICATE_WEBHOOK_URL) {
        // Handle synchronous prediction result
        message.reply('Prediction result: ' + JSON.stringify(prediction));
      } else {
        // Handle asynchronous prediction (via webhook)
        const predictionId = prediction.id;
        debug('Prediction ID: ' + predictionId);
        predictionImageMap.set(predictionId, imageUrl);
      }
      return true;
    } else {
      logger.debug('No attachments found');
      return false;
    }
  } catch (error: any) {
    debug('ERROR:', 'Error in handleImageMessage: ' + error.message);
    return false;
  }
}
