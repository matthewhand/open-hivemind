import convict from 'convict';

const n8nConfig = convict({
    N8N_API_URL: {
        doc: 'N8N API URL',
        format: String,
        default: 'http://localhost:5678/',
        env: 'N8N_API_URL'
    },
    N8N_API_KEY: {
        doc: 'N8N API Key',
        format: String,
        default: '',
        env: 'N8N_API_KEY'
    }
});

n8nConfig.validate({ allowed: 'strict' });

export default n8nConfig;
