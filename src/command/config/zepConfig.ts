import convict from 'convict';

const zepConfig = convict({
    ZEP_API_URL: {
        doc: 'Zep API URL',
        format: String,
        default: 'https://api.zep.com',
        env: 'ZEP_API_URL'
    },
    ZEP_API_KEY: {
        doc: 'Zep API Key',
        format: String,
        default: '',
        env: 'ZEP_API_KEY'
    }
});

zepConfig.validate({ allowed: 'strict' });

export default zepConfig;
