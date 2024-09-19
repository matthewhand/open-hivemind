import convict from 'convict';

const flowiseConfig = convict({
    FLOWISE_BASE_URL: {
        doc: 'Base URL for Flowise API',
        format: String,
        default: '',
        env: 'FLOWISE_BASE_URL'
    },
    FLOWISE_API_KEY: {
        doc: 'API Key for Flowise API',
        format: String,
        default: '',
        env: 'FLOWISE_API_KEY'
    },
    FLOWISE_CONVERSATION_CHATFLOW_ID: {
        doc: 'Chatflow ID for conversation interactions',
        format: String,
        default: '',
        env: 'FLOWISE_CONVERSATION_CHATFLOW_ID'
    },
    FLOWISE_COMPLETION_CHATFLOW_ID: {
        doc: 'Chatflow ID for text completion tasks',
        format: String,
        default: '',
        env: 'FLOWISE_COMPLETION_CHATFLOW_ID'
    },
    FLOWISE_USE_REST: {
        doc: 'Flag to use REST client instead of SDK',
        format: Boolean,
        default: false,
        env: 'FLOWISE_USE_REST'
    }
});

flowiseConfig.validate({ allowed: 'strict' });

export default flowiseConfig;
