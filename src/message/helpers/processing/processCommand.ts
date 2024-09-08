import Debug from "debug";
import { generateChatResponse } from '@src/integrations/openai/chat/generateChatResponse';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:processCommand');

/**
 * Process Command
 * 
 * This function processes a command extracted from a given message. It identifies and executes the command, 
 * or if no command is found, it uses LLM to generate a response. 
 * 
 * @param {IMessage} message - The original message object containing the command or text.
 * @param {(result: string) => Promise<void>} callback - A callback function to handle the result (either command or LLM).
 * @returns {Promise<void>} A promise that resolves when processing is complete.
 */
export async function processCommand(
  message: IMessage,
  callback: (result: string) => Promise<void>
): Promise<void> {
  try {
    const text = message.getText().trim();

    // Handle non-command messages by generating LLM response
    if (!text.startsWith('!')) {
      debug('[processCommand] No command found. Using LLM to generate response.');
      try {
        const llmResult = await generateChatResponse(text);
        await callback(llmResult);
      } catch (llmError: any) {
        debug('[processCommand] Error generating LLM response: ' + (llmError instanceof Error ? llmError.message : String(llmError)));
      }
      return;
    }

    // Handle command messages
    const command = text.slice(1).split(' ')[0];  // Extract command after the "!"
    debug('[processCommand] Command extracted: ' + command);

    // Simulated command processing logic
    const commandResult = `Executed command: ${command}`;
    await callback(commandResult);

  } catch (error: any) {
    debug('[processCommand] Error processing message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
