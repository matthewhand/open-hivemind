import convict from 'convict';

const pythonConfig = convict({
    PYTHON_EXEC_PATH: {
        doc: 'Path to the Python executable',
        format: String,
        default: '/usr/bin/python3',
        env: 'PYTHON_EXEC_PATH'
    }
});

pythonConfig.validate({ allowed: 'strict' });

export default pythonConfig;
