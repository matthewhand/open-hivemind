import { Message } from 'discord.js';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import DiscordMessage from '../DiscordMessage';
import { fetchChannel } from '../fetchers/fetchChannel';
import { generateResponse } from '../generateResponse';

const debug = Debug('app:discord:handleMessage');

/**
 * Handles an incoming message, generating a response if necessary.
 * @param {Message} message - The incoming Discord message.
 * @param {(message: IMessage, history: IMessage[]) => Promise<void>} handler - Function to handle messages.
 */
export async function handleMessage(
  message: Message,
  handler: (message: IMessage, history: IMessage[]) => Promise<void>
): Promise<void> {
  try {
    debug('[handleMessage] Processing message with ID ' + message.id);
    const discordMessage = new DiscordMessage(message);
    const channel = await fetchChannel(message.client, message.channelId);

    if (!channel) {
      debug('[handleMessage] Channel not found for ID ' + message.channelId);
      return;
    }

    const response = await generateResponse(discordMessage);
    await handler(discordMessage, response.history);
  } catch (error: any) {
    debug('[handleMessage] Error processing message: ' + (error instanceof Error ? error.message : String(error)), { error });
  }
}