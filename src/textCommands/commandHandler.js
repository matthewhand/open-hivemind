const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');
const { handleHttpCommand } = require('./handleHttpCommand');

const commandHandlers = {
    'analyse': {
        handler: handleImageAnalysis,
        description: 'Analyzes an image. Usage: !analyse [imageUrl]'
    },
    'analyze': {
        handler: handleImageAnalysis,
        description: 'Analyzes an image (alias for !analyse). Usage: !analyze [imageUrl]'
    },
    'llava': {
        handler: handleImageAnalysis,
        description: 'Alias for !analyze. Usage: !llava [imageUrl]'
    },
    'perplexity': {
        handler: handlePerplexityRequest,
        description: 'Calculates perplexity for provided text. Usage: !perplexity [text]'
    },
    'quivr': {
        handler: handleQuivrRequest,
        description: 'Sends a query to the Quivr API. Usage: !quivr [query]'
    },
    'flowise': {
        handler: handleFlowiseRequest,
        description: 'Sends a query to the Flowise API. Usage: !flowise [query]'
    },
    'python': {
        handler: handlePythonRequest,
        description: 'Executes Python code blocks. Usage: !python [code]'
    },
    'execute': {
        handler: handlePythonRequest,
        description: 'Executes Python code (alias for !python). Usage: !execute [code]'
    },
    'http': {
        handler: handleHttpCommand,
        description: 'Executes HTTP commands. Usage: !http [action] [query]'
    },
    'help': {
        handler: handleHelpCommand, // Defined below
        description: 'Displays this help message. Usage: !help'
    }
};


// Define the help command handler
function handleHelpCommand(message) {
    let helpMessage = 'Available commands:\n';
    for (const [command, info] of Object.entries(commandHandlers)) {
        helpMessage += `- ${command}: ${info.description}\n`;
    }
    message.reply(helpMessage);
}

// Main command handler function
async function commandHandler(message, commandContent) {
    console.log(`Received in commandHandler: ${commandContent}`); // Debug log

    const commandRegex = /^!(\w+)\s*/;
    const matches = commandContent.match(commandRegex);

    if (matches) {
        const command = matches[1].toLowerCase();
        console.log(`Command identified: ${command}`); // Debug log

        const args = commandContent.replace(commandRegex, '');
        console.log(`Arguments: ${args}`); // Debug log

        if (commandHandlers[command]) {
            console.log(`Executing handler for command: ${command}`); // Debug log
            await commandHandlers[command].handler(message, args);
            console.log(`Executed handler for command: ${command}`); // Debug log
        } else {
            console.log(`Unknown command: ${command}`); // Debug log
            message.reply('Unknown command: ' + command);
        }
    } else {
        console.log('No command found in the message'); // Debug log
    }
}

module.exports = { commandHandler };