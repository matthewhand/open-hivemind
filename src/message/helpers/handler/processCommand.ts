import Debug from 'debug';  // ✅ Added missing import
import { handleStatusCommand } from '../commands/statusCommand';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:processCommand');  // ✅ Initialize Debug instance

/**
 * Process Command
 * 
 * This function processes a command extracted from a given message. It identifies and executes the command, 
 * or returns false if no command is found.
 * 
 * @param {IMessage} message - The original message object containing the command or text.
 * @param {(result: string) => Promise<void>} callback - A callback function to handle the result.
 * @returns {Promise<boolean>} A promise that resolves to true if a command was processed, false otherwise.
 */
export async function processCommand(
  message: IMessage,
  callback: (result: string) => Promise<void>
): Promise<boolean> {
  try {
    const text = message.getText().trim();

    // Handle non-command messages (no command found)
    if (!text.startsWith('!')) {
      debug('[processCommand] No command found.');
      return false;
    }

    // Handle command messages
    const command = text.slice(1).split(' ')[0];  // Extract command after the "!"
    const argsString = text.slice(1 + command.length).trim(); // Extract arguments after the command
    const args = argsString ? argsString.split(/\s+/) : [];
    debug('[processCommand] Command extracted: ' + command);

    if (command.toLowerCase() === 'status') {
      const result = await handleStatusCommand(args);
      await callback(result);
    } else {
      // Simulated command processing logic for other commands
      const commandResult = `Executed command: ${command}`;
      await callback(commandResult);
    }

    return true;
  } catch (error: any) {
    debug('[processCommand] Error processing message: ' + (error instanceof Error ? error.message : String(error)));
    return false;
  }
}
