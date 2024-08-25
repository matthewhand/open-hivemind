import Debug from "debug";
const debug = Debug("app");

import { Message } from 'discord.js';
import Debug from 'debug';
import { fetchChannel } from '../fetchers/fetchChannel';
import { generateResponse } from '../interaction/generateResponse';
import { processAIResponse } from '@src/message/interaction/processAIResponse';
const debug = Debug('app:discord:handleMessage');

/**
 * Handles an incoming message, generating a response if necessary.
 * @param {Message} message - The incoming Discord message.
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
