import { IConfig } from '../types/IConfig';

class BashConfig implements IConfig {
    public readonly BASH_EXEC_PATH: string = '/bin/bash';

    constructor() {
        console.log('BashConfig initialized');
    }
}

export default BashConfig;
