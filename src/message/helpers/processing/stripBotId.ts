import messageConfig from '../../interfaces/messageConfig';
import Debug from 'debug';

const debug = Debug('app:stripBotId');

/**
 * Strips all references to the bot's ID from the message.
 * @param message - The original message string.
 * @param botId - The bot's unique ID to be removed.
 * @returns Message without bot ID references.
 */
export function stripBotId(message: string, botId: string): string {
    const botIdRegex = new RegExp(`<@${botId}>`, 'g');
    debug(`Stripping bot ID: ${botId} from message: "${message}"`);

    if (messageConfig.get('MESSAGE_STRIP_BOT_ID')) {
        const result = message.replace(botIdRegex, '');
        debug(`Result after stripping: "${result}"`);
        return result;
    }

    return message;
}
