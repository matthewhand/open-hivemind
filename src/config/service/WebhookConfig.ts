import ConfigurationManager from '../ConfigurationManager';

class WebhookConfig extends ConfigurationManager {
    public readonly WEBHOOK_URL: string = this.getEnvConfig('WEBHOOK_URL', 'webhook.url', 'https://example.com/webhook');
}

export default WebhookConfig;
