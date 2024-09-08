"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PythonHandler {
    constructor() {
        console.log('PythonHandler initialized');
    }
    handleCommand(command) {
        console.log(`Handling command with Python: ${command}`);
    }
}
exports.default = PythonHandler;
