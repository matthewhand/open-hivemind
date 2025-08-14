/**
 * Sends a response message to a specified channel.
 *
 * @param client - The Discord client instance.
 * @param channelId - The ID of the channel to send the message to.
 * @param message - The message content to send.
 * @returns A promise resolving when the message is sent.
 */
export async function sendResponse(client: any, channelId: string, message: string): Promise<void> {
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.send) {
            await channel.send(message);
        } else {
            throw new Error('Unable to find channel or send message');
        }
    } catch (error: any) {
        console.error('[sendResponse] Error sending response:', error);
        throw error;
    }
}
