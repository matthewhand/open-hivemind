import Debug from "debug";
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import { Message } from 'discord.js';

const debug = Debug('app:sendAiGeneratedMessage');

/**
 * Send AI-Generated Message
 *
 * This function generates a response using the OpenAiService based on a given prompt and sends it as a reply to an original message.
 * It ensures that the response is relevant and adds value to the conversation, particularly in scenarios where the AI can suggest
 * useful commands or follow-up actions.
 *
 * Key Features:
 * - Generates AI responses using OpenAiService.
 * - Replies to the original message with the generated content.
 * - Logs detailed information about the message-sending process.
 *
 * @param {OpenAiService} aiManager - The OpenAI manager instance.
 * @param {Message} originalMessage - The original message that triggered the AI response.
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @returns {Promise<void>} A promise that resolves when the AI response is sent.
 */
export async function sendAiGeneratedMessage(
  aiManager: OpenAiService,
  originalMessage: Message,
  prompt: string
): Promise<void> {
  try {
    // Generate a response using the OpenAiService
    const response = await aiManager.generateResponse(prompt);

    // Reply to the original message with the AI-generated response
    await originalMessage.reply(response);
    debug('AI-generated message sent: ' + response);
  } catch (error: any) {
    debug('Error sending AI-generated message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
EOF && 

cat << 'EOF' > src/message/followUp/sendFollowUpMessage.ts
import Debug from "debug";
import { Message } from 'discord.js';

const debug = Debug('app:sendFollowUpMessage');

/**
 * Send Follow-Up Message
 *
 * This function sends a follow-up message to a specified channel, typically used to add context or provide additional value after
 * the initial conversation. It ensures that the follow-up is relevant and timely, based on the original interaction.
 *
 * Key Features:
 * - Sends follow-up messages to enhance the conversation.
 * - Handles errors robustly, ensuring that issues are logged and can be traced.
 * - Logs detailed information about the message-sending process.
 *
 * @param {Message} originalMessage - The original message that triggered the follow-up.
 * @param {string} content - The content of the follow-up message.
 * @returns {Promise<void>} A promise that resolves when the message is sent.
 */
export async function sendFollowUpMessage(
  originalMessage: Message,
  content: string
): Promise<void> {
  try {
    const channel = originalMessage.channel;
    await channel.send(content);
    debug('Follow-up message sent: ' + content);
  } catch (error: any) {
    debug('Error sending follow-up message: ' + (error instanceof Error ? error.message : String(error)));
  }
}
