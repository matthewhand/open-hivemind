import convict from 'convict';

const bashConfig = convict({
    BASH_EXEC_PATH: {
        doc: 'Path to the bash executable',
        format: String,
        default: '/bin/bash',
        env: 'BASH_EXEC_PATH'
    }
});

bashConfig.validate({ allowed: 'strict' });

export default bashConfig;
