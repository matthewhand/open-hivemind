/**
 * Sets a callback function to handle incoming Discord messages.
 * @param {(message: any) => void} messageHandlerCallback - The function to be called with the message data.
 * @throws Will throw an error if messageHandlerCallback is not a function.
 */
export function setMessageHandler(messageHandlerCallback: (message: any) => void): void {
    if (typeof messageHandlerCallback !== 'function') {
        throw new Error('messageHandlerCallback must be a function');
    }
    this.messageHandler = messageHandlerCallback;
}
