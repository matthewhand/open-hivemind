import convict from 'convict';

const webhookConfig = convict({
    WEBHOOK_ENABLED: {
        doc: 'Whether to enable the webhook service',
        format: Boolean,
        default: false,
        env: 'WEBHOOK_ENABLED',
    },
    WEBHOOK_TOKEN: {
        doc: 'Token used to verify incoming webhook requests',
        format: String,
        default: '',
        env: 'WEBHOOK_TOKEN',
    },
    WEBHOOK_IP_WHITELIST: {
        doc: 'Comma-separated list of IPs allowed to send webhook requests',
        format: String,
        default: '',
        env: 'WEBHOOK_IP_WHITELIST',
    }
});

webhookConfig.validate({ allowed: 'strict' });

export default webhookConfig;
