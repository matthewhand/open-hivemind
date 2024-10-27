import messageConfig from '../../interfaces/messageConfig';
import Debug from 'debug';

const debug = Debug('app:addUserHint');

/**
 * Adds a user hint to the message if enabled.
 * @param message - The original message string.
 * @param userId - The user ID to insert as a hint.
 * @param botId - The bot's unique ID to be replaced.
 * @returns Message with the user hint added.
 */
export function addUserHint(message: string, userId: string, botId: string): string {
    const botIdRegex = new RegExp(`<@${botId}>`, 'g');
    debug(`Adding user hint for user ${userId} in message: "${message}"`);

    if (messageConfig.get('MESSAGE_ADD_USER_HINT')) {
        const result = message.replace(botIdRegex, `(from <@${userId}>)`);
        debug(`Result after adding user hint: "${result}"`);
        return result;
    }

    return message;
}
