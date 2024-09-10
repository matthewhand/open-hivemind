import { Message } from 'discord.js';
import discordConfig from '@integrations/discord/interfaces/discordConfig';

/**
 * Handles incoming Discord messages and processes them.
 */
export async function handleMessage(message: Message): Promise<void> {
  try {
    const channel = message.channel;

    // Fix: Ensure proper type casting for message history limit
    const messageHistoryLimit = discordConfig.get('DISCORD_MESSAGE_HISTORY_LIMIT') as number || 10;

    // Fix: Use isTextBased() instead of deprecated isText()
    if (channel.isTextBased()) {
      // Fetch messages with the limit from config or default value
      const fetchedMessages = await channel.messages.fetch({ limit: messageHistoryLimit });

      // Process each fetched message
      fetchedMessages.forEach((msg) => {
        console.log(`Processing message: ${msg.content}`);
      });
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
}
