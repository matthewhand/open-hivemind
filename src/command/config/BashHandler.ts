export default class BashHandler {
    constructor() {
        console.log('BashHandler initialized');
    }

    handleCommand(command: string) {
        console.log(`Handling command with Bash: ${command}`);
    }
}
