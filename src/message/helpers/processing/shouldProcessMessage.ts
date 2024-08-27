import Debug from "debug";

import constants from '@config/ConfigurationManager';
import { getLastMessageTimestamp } from '../timing/timestampFunctions';

const debug = Debug('app:shouldProcessMessage');

/**
 * Determines if a message should be processed based on specific criteria, such as recent activity in the channel
 * and whether the message author is the bot itself.
 *
 * @param messageTimestamp - The timestamp of the incoming message.
 * @param channelId - The ID of the channel where the message was received.
 * @param authorId - The ID of the message author.
 * @param messageTimestamps - A map storing the last message timestamps for channels.
 * @returns A boolean indicating whether the message should be processed.
 */
export function shouldProcessMessage(
    messageTimestamp: number,
    channelId: string,
    authorId: string,
    messageTimestamps: Map<string, number>
): boolean {
    debug('[shouldProcessMessage] Checking if message in channel ' + channelId + ' should be processed.');
    // Skip processing if the author is the bot itself
    if (authorId === ConfigurationManager.DISCORD_BOT_USER_ID) {
        debug('[shouldProcessMessage] Skipping message from bot itself in channel ' + channelId + '.');
        return false;
    }
    const lastMessageTimestamp = getLastMessageTimestamp(messageTimestamps, channelId);
    const timeSinceLastMessage = messageTimestamp - lastMessageTimestamp;
    debug('[shouldProcessMessage] Time since last message in channel ' + channelId + ': ' + timeSinceLastMessage + 'ms.');
    // Skip processing if the message was sent too soon after the last one
    if (timeSinceLastMessage < constants.MESSAGE_MIN_INTERVAL_MS) {
        debug('[shouldProcessMessage] Skipping message in channel ' + channelId + ' due to short interval: ' + timeSinceLastMessage + 'ms.');
        return false;
    }
    debug('[shouldProcessMessage] Message in channel ' + channelId + ' will be processed.');
    return true;
}
