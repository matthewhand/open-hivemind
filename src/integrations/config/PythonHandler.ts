import Debug from 'debug';
const debug = Debug('app:PythonHandler');

export default class PythonHandler {
    constructor() {
        debug('PythonHandler initialized');
    }

    handleCommand(command: string) {
        debug('Handling command with Python: %s', command);
    }
}
