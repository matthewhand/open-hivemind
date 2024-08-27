import Debug from "debug";
import { Message } from 'discord.js';
import { fetchChannel } from '../fetchers/fetchChannel';
import { generateResponse } from '../interaction/generateResponse';
import { processAIResponse } from '@src/message/interaction/processAIResponse';

const debug = Debug('app:handleMessage');

/**
 * Handle Discord Message Event
 * 
 * This function processes incoming Discord messages. It fetches the corresponding channel,
 * generates a response if needed, and handles the response using an AI processing function.
 * 
 * The function includes robust error handling to log issues encountered during processing.
 * 
 * @param {Message} message - The incoming Discord message to handle.
 */
export async function handleMessage(
  message: Message<boolean>
): Promise<void> {
  try {
    debug('[handleMessage] Processing message with ID ' + message.id);
    const channel = await fetchChannel(message.client, message.channelId);
    if (!channel) {
      debug('[handleMessage] Channel not found for ID ' + message.channelId);
      return;
    }
    const response = await generateResponse(message.content);
    await processAIResponse(response, message);
  } catch (error: any) {
    debug('[handleMessage] Error processing message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
