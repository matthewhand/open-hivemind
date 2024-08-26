import Debug from "debug";

import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:processCommand');

/**
 * Process Command
 *
 * This function processes a command extracted from a given message. It identifies and executes the command, then passes the result
 * to a callback function for further handling. The function also includes logging for each step of the process.
 *
 * Key Features:
 * - Extracts and identifies commands from a given message.
 * - Simulates command execution and provides the result via a callback.
 * - Logs detailed information about the command processing steps, including errors.
 *
 * @param {IMessage} message - The original message object containing the command.
 * @param {(result: string) => Promise<void>} callback - A callback function to handle the command result.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export async function processCommand(
  message: IMessage,
  callback: (result: string) => Promise<void>
): Promise<void> {
  try {
    const text = message.getText().trim();
    if (!text.startsWith('!')) {
      debug('[processCommand] No command found in message: ' + text);
      return;
    }
    const command = text.slice(1).split(' ')[0];
    debug('[processCommand] Command extracted: ' + command);
    // Simulated command processing logic (e.g., checking against a command list)
    const commandResult = `Executed command: ${command}`;
    await callback(commandResult);
  } catch (error: any) {
    debug('[processCommand] Error processing command: ' + (error instanceof Error ? error.message : String(error)));
  }
}
