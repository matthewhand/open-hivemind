import convict from 'convict';

const replicateConfig = convict({
    REPLICATE_API_URL: {
        doc: 'Replicate API URL',
        format: String,
        default: 'https://api.replicate.com',
        env: 'REPLICATE_API_URL'
    },
    REPLICATE_API_KEY: {
        doc: 'Replicate API Key',
        format: String,
        default: '',
        env: 'REPLICATE_API_KEY'
    }
});

replicateConfig.validate({ allowed: 'strict' });

export default replicateConfig;
