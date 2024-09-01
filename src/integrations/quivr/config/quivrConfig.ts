import convict from 'convict';

const quivrConfig = convict({
    QUIVR_API_URL: {
        doc: 'Quivr API URL',
        format: String,
        default: 'https://api.quivr.com',
        env: 'QUIVR_API_URL'
    },
    QUIVR_API_KEY: {
        doc: 'Quivr API Key',
        format: String,
        default: '',
        env: 'QUIVR_API_KEY'
    }
});

quivrConfig.validate({ allowed: 'strict' });

export default quivrConfig;
