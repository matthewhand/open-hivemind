import logger from '@src/utils/logger';
import CommandManager from '../../managers/CommandManager';

/**
 * Processes a command contained within a message.
 * Identifies if the text is a command and, if so, executes it using the CommandManager.
 * 
 * @param {IMessage} message - The message object containing the potential command.
 * @returns {Promise<boolean>} - Returns true if a command was processed successfully, false otherwise.
 */
export async function processCommand(message: IMessage): Promise<boolean> {
    if (!message || typeof message.getText !== 'function') {
        logger.error('[processCommand] Invalid message object.', { message });
        return false;
    }

    const text = message.getText().trim();
    logger.debug('[processCommand] Processing text: ' + text);

    if (!text.startsWith('!')) {
        logger.debug('[processCommand] No command prefix found in: ' + text);
        return false;  // Not a command
    }

    const commandManager = new CommandManager();
    try {
        const commandResult = await commandManager.executeCommand(message);
        if (commandResult.success) {
            logger.info('[processCommand] CommandHandler "' + commandResult.command + '" executed successfully.', { commandResult });
            return true;
        } else {
            logger.error('[processCommand] CommandHandler "' + commandResult.command + '" failed with error: ' + commandResult.error, { commandResult });
            return false;
        }
    } catch (error: any) {
        logger.error('[processCommand] Exception while executing command: ' + error.message, { error });
        throw error;  // Rethrow after logging to handle the exception further up the call stack
    }
}
