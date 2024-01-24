const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');
const { handleHttpCommand } = require('./handleHttpCommand');
const { handleReportCommand } = require('./handleReportCommand');
const { handleMuteCommand } = require('./handleMuteCommand');

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
    'mute': {
        handler: handleMuteCommand,
        description: 'Mutes a user for a specified duration. Usage: !mute <userID> [duration]'
    },
    'quivr': {
        handler: (message, args) => {
            const [action, ...restArgs] = args.split(' ');
            handleQuivrRequest(message, restArgs.join(' '), action);
        },
        description: 'Sends a query to the Quivr API. Usage: !quivr [action] [query]'
    },
    'python': {
        handler: handlePythonRequest,
        description: 'Executes Python code blocks. Usage: !python [code]'
    },
    'execute': {
        handler: handlePythonRequest,
        description: 'Executes Python code (alias for !python). Usage: !execute [code]'
    },
    'flowise': {
        handler: handleFlowiseRequest,
        description: 'Sends a query to the Flowise API or lists available actions if on argument is provided. Usage: !flowise [action] [query]'
    },
    'http': {
        handler: handleHttpCommand,
        description: 'Executes HTTP commands or lists available actions if no argument is provided. Usage: !http [action] [query]'
    },
    'report': { 
        handler: handleReportCommand,
        description: "User reports about issues or rule violations within the server"
    },
    'alias': {
        handler: handleAliasCommand,
        description: 'Lists all configured command aliases. Usage: !alias'
    },
    'help': {
        handler: handleHelpCommand, // Defined below
        description: 'Displays this help message. Usage: !help'
    }
};

const aliases = {
    'shakespear': 'quivr shakespear',
    'gpt4': 'flowise gpt4',
    // Add more aliases here as needed
};

function handleAliasCommand(message) {
    let aliasMessage = 'Configured command aliases:\n';
    for (const [alias, command] of Object.entries(aliases)) {
        aliasMessage += `- !${alias}: ${command}\n`;
    }
    message.reply(aliasMessage);
}

// Define the help command handler
function handleHelpCommand(message) {
    let helpMessage = 'Available commands:\n';
    for (const [command, info] of Object.entries(commandHandlers)) {
        helpMessage += `- !${command}: ${info.description}\n`;
    }
    message.reply(helpMessage);
}

async function commandHandler(message, commandContent) {
    console.log(`Received in commandHandler: ${commandContent}`); // Debug log

    const commandRegex = /^!(\w+)\s*(.*)/; // Modified to capture the rest of the command
    let matches = commandContent.match(commandRegex);
    if (matches) {
        let command = matches[1].toLowerCase();
        let args = matches[2]; // Capture the rest of the command as arguments

        // Translate alias to actual command
        if (aliases[command]) {
            const translatedCommand = aliases[command] + ' ' + args;
            matches = translatedCommand.match(commandRegex);
            command = matches && matches[1].toLowerCase();
            args = matches[2];
        }

        console.log(`Command identified: ${command}`); // Debug log

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