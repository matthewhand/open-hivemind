const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');
const { handleHttpCommand } = require('./handleHttpCommand');

const commandHandlers = {
    'analyse': handleImageAnalysis,
    'analyze': handleImageAnalysis,
    'llava': handleImageAnalysis,
    'perplexity': handlePerplexityRequest,
    'quivr': handleQuivrRequest,
    'flowise': handleFlowiseRequest,
    'python': handlePythonRequest,
    'execute': handlePythonRequest,
    'http': handleHttpCommand
};

async function commandHandler(message, commandContent) {
    console.log(`Received in commandHandler: ${commandContent}`); // Debug: log received command content

    const commandRegex = /^!(\w+)\s*/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const command = matches[1].toLowerCase();
        console.log(`Command identified: ${command}`); // Debug: log identified command

        const args = commandContent.replace(commandRegex, '');
        console.log(`Arguments: ${args}`); // Debug: log arguments

        if (commandHandlers[command]) {
            console.log(`Executing handler for command: ${command}`); // Debug: log before executing handler
            await commandHandlers[command](message, args);
            console.log(`Executed handler for command: ${command}`); // Debug: log after executing handler
        } else {
            console.log(`Unknown command: ${command}`); // Debug: log if command is unknown
        }
    } else {
        console.log('No command found in the message'); // Debug: log if no command is found
    }
}

module.exports = { commandHandler };
