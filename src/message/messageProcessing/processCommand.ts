import { IMessage } from '@src/message/interfaces/IMessage';
/**
 * Processes a command extracted from the given message.
 * @param {IMessage} message - The original message object.
 * @param {(result: string) => Promise<void>} callback - A callback function to handle the result.
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export async function processCommand(
  message: IMessage,
  callback: (result: string) => Promise<void>
): Promise<void> {
  try {
    const text = message.getText().trim();
    if (!text.startsWith('!')) {
      debug.debug('[processCommand] No command found in message: ' + text);
      return;
    }
    const command = text.slice(1).split(' ')[0];
    debug.debug('[processCommand] Command extracted: ' + command);
    // Simulated command processing logic (e.g., checking against a command list)
    const commandResult = `Executed command: ${command}`;
    await callback(commandResult);
  } catch (error: any) {
    debug('[processCommand] Error processing command: ' + (error instanceof Error ? error.message : String(error)));
  }
}
