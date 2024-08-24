class MessageResponseManager {
    private static instance: MessageResponseManager;

    private constructor() {}

    public static getInstance(): MessageResponseManager {
        if (!MessageResponseManager.instance) {
            MessageResponseManager.instance = new MessageResponseManager();
        }
        return MessageResponseManager.instance;
    }
}

export default MessageResponseManager;
