const { handleImageAnalysis } = require('./handleImageAnalysis');
const { handlePerplexityRequest } = require('./handlePerplexityRequest');
const { handleQuivrRequest } = require('./handleQuivrRequest');
const { handleFlowiseRequest } = require('./handleFlowiseRequest');
const { handlePythonRequest } = require('./handlePythonRequest');
const { handleHttpCommand } = require('./handleHttpCommand');
const { handleReportCommand } = require('./handleReportCommand');
const { handleMuteCommand } = require('./handleMuteCommand');

const commandHandlers = {
    'image': {
        handler: handleImageAnalysis,
        description: 'Analyzes an image. Usage: !image [imageUrl]'
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
        handler: handleQuivrRequest,
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
    'suntzu': 'quivr suntzu',
    'gpt4': 'flowise gpt4',
    'mtg': 'flowise qdrant_pplx',
    'search': 'perplexity',
    'video': 'http modal',
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

    // Updated regex to handle optional @bot prefix
    const commandRegex = /(?:@bot\s+)?^!(\w+)\s*(.*)/; 
    let matches = commandContent.match(commandRegex);

    if (matches) {
        let command = matches[1].toLowerCase();
        let args = matches[2];

// Translate alias to actual command
if (aliases[command]) {
    const translatedCommand = '!' + aliases[command] + ' ' + args;
    matches = translatedCommand.match(commandRegex);
    if (matches) {
        command = matches[1].toLowerCase();
        args = matches[2];
    } else {
        // Handle the case where translated command does not match the expected format
        console.error(`Error translating alias: ${translatedCommand}`);
        return;
    }
}

        console.log(`Command identified: ${command}`); // Debug log

        // Special handling for Quivr and other commands
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