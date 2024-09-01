import convict from 'convict';

const perplexityConfig = convict({
    PERPLEXITY_CHAT_COMPLETION_URL: {
        doc: 'Perplexity Chat Completion API URL',
        format: String,
        default: 'https://api.perplexity.ai/chat/completions',
        env: 'PERPLEXITY_CHAT_COMPLETION_URL'
    }
});

perplexityConfig.validate({ allowed: 'strict' });

export default perplexityConfig;
