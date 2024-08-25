import { Message } from 'discord.js';
import { processAIResponse } from '@src/message/interaction/processAIResponse';
import Debug from 'debug';

const debug = Debug('app:message:processCommand');

/**
 * Processes a command from a message.
 * @param message The message containing the command.
 * @param args The arguments for the command.
 */
export async function processCommand(message: Message, args: string[]) {
    debug('Processing command from message: ' + message.content);
    const response = await processAIResponse(message, args);
    if (response) {
        message.channel.send(response);
    } else {
        debug('No response generated for command.');
    }
}
