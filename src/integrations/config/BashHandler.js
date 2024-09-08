"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BashHandler {
    constructor() {
        console.log('BashHandler initialized');
    }
    handleCommand(command) {
        console.log(`Handling command with Bash: ${command}`);
    }
}
exports.default = BashHandler;
