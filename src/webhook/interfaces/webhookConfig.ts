import convict from 'convict';

const webhookConfig = convict({
    WEBHOOK_SECRET_TOKEN: {
        doc: 'Secret token for webhook authentication',
        format: String,
        default: 'your_secret_token',
        env: 'WEBHOOK_SECRET_TOKEN'
    },
    WEBHOOK_WHITELISTED_IPS: {
        doc: 'List of IPs allowed to send requests',
        format: Array,
        default: ['127.0.0.1'],
        env: 'WEBHOOK_WHITELISTED_IPS'
    }
});

export default webhookConfig;
