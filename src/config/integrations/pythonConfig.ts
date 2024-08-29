import { IConfig } from '../types/IConfig';

class PythonConfig implements IConfig {
    public readonly PYTHON_EXEC_PATH: string = '/usr/bin/python3';

    constructor() {
        console.log('PythonConfig initialized');
    }
}

export default PythonConfig;
