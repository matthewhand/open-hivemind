




export async function processCommand(message: IMessage): Promise<void> {
    try {
        const command = message.getText().split(' ')[0]; // Adjusted to extract command
        if (!command) {
            throw new Error('Command not found in the message.');
        }

        const response = await executeCommand(command);
        await sendMessagePart(response, message.getChannelId());
        logger.info('Command processed successfully.');
    } catch (error: any) {
        logger.error('Failed to process command: ' + error.message);
        await processAIResponse(message);
    }
}

async function executeCommand(command: string): Promise<string> {
    // Logic to execute the command and return a response
    return 'Executed command: ' + command;
}
