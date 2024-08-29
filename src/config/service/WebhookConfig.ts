import ConfigurationManager from '../ConfigurationManager';

class WebhookConfig {
    private configManager = new ConfigurationManager();
    public readonly WEBHOOK_URL: string = this.configManager.getConfig('service.webhook.url', 'https://your-webhook-url');

    constructor() {
        console.log('WebhookConfig initialized');
    }
}

export default WebhookConfig;
