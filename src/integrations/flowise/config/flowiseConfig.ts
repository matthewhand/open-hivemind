import convict from 'convict';

const flowiseConfig = convict({
    FLOWISE_API_URL: {
        doc: 'Flowise API URL',
        format: String,
        default: 'http://localhost:3002/',
        env: 'FLOWISE_API_URL'
    },
    FLOWISE_API_KEY: {
        doc: 'Flowise API Key',
        format: String,
        default: '',
        env: 'FLOWISE_API_KEY'
    }
});

flowiseConfig.validate({ allowed: 'strict' });

export default flowiseConfig;
