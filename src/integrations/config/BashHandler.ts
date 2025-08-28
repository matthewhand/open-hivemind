import Debug from 'debug';
const debug = Debug('app:BashHandler');

export default class BashHandler {
    constructor() {
        debug('BashHandler initialized');
    }

    handleCommand(command: string) {
        debug('Handling command with Bash: %s', command);
    }
}
