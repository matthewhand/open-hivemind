import convict from 'convict';

const perplexityConfig = convict({
    PERPLEXITY_CHAT_COMPLETION_URL: {
        doc: 'Perplexity Chat Completion API URL',
        format: String,
        default: 'https://api.perplexity.ai/chat/completions',
        env: 'PERPLEXITY_CHAT_COMPLETION_URL'
    },
    PERPLEXITY_API_KEY: {
        doc: 'Perplexity API Key',
        format: String,
        default: '',
        env: 'PERPLEXITY_API_KEY'
    },
    PERPLEXITY_MODEL: {
        doc: 'Perplexity Model',
        format: String,
        default: 'llama-3.1-sonar-small-128k-chat',
        env: 'PERPLEXITY_MODEL'
    },
    PERPLEXITY_TIMEOUT: {
        doc: 'Timeout for Perplexity requests (ms)',
        format: 'nat',
        default: 10000,
        env: 'PERPLEXITY_TIMEOUT'
    }
});

perplexityConfig.validate({ allowed: 'strict' });

export default perplexityConfig;
