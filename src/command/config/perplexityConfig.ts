import config from 'config';

class perplexityConfig {
    public readonly PERPLEXITY_CHAT_COMPLETION_URL: string;

    constructor() {
        this.PERPLEXITY_CHAT_COMPLETION_URL = process.env.PERPLEXITY_CHAT_COMPLETION_URL || (config.has('perplexity.PERPLEXITY_CHAT_COMPLETION_URL') ? config.get<string>('perplexity.PERPLEXITY_CHAT_COMPLETION_URL') : 'https://api.perplexity.ai/chat/completions');
    }
}

export default perplexityConfig;
