import config from 'config';

export default class PythonConfig {
    public readonly PYTHON_EXEC_PATH: string;

    constructor() {
        this.PYTHON_EXEC_PATH = process.env.PYTHON_EXEC_PATH || (config.has('python.PYTHON_EXEC_PATH') ? config.get<string>('python.PYTHON_EXEC_PATH') : '/usr/bin/python3');
        console.log('PythonConfig initialized');
    }
}
