const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');

const commandHandlers = {
    'analyse': handleImageAnalysis,
    'analyze': handleImageAnalysis,
    'llava': handleImageAnalysis,
    'perplexity': handlePerplexityRequest,
    'quivr': handleQuivrRequest,
    'flowise': handleFlowiseRequest,
    'python': handlePythonRequest,
    'execute': handlePythonRequest
};

async function commandHandler(message, commandContent) {
    console.log(`Received in commandHandler: ${commandContent}`); // Debug

    const commandRegex = /^!(\w+)\s*/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const command = matches[1].toLowerCase();
        console.log(`Command identified: ${command}`); // Debug

        const args = commandContent.replace(commandRegex, '');
        console.log(`Arguments: ${args}`); // Debug

        if (commandHandlers[command]) {
            await commandHandlers[command](message, args);
        } else {
            console.log(`Unknown command: ${command}`); // Debug
        }
    } else {
        console.log('No command found in the message'); // Debug
    }
}

module.exports = { commandHandler };
