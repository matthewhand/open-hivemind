import configurationManager from '@src/common/config/ConfigurationManager';

export class MessageResponseManager {
    private static instance: MessageResponseManager;

    private constructor() {}

    public static getInstance(): MessageResponseManager {
        if (!MessageResponseManager.instance) {
            MessageResponseManager.instance = new MessageResponseManager();
        }
        return MessageResponseManager.instance;
    }

    public async getMessageResponse(): Promise<string> {
        const messageResponseSettings = configurationManager.getConfig('messageResponseSettings', 'default-settings');
        return `Response with settings: ${messageResponseSettings}`;
    }
}
