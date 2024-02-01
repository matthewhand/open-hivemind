const { handleImageAnalysis } = require('../commands/image');
const { handlePerplexityRequest } = require('../commands/perplexity');
const { handleQuivrRequest } = require('../commands/quivr');
const { handleFlowiseRequest } = require('../commands/flowise');
const { handlePythonRequest } = require('../commands/python');
const { handleHttpCommand } = require('../commands/http');
const { handleReportCommand } = require('../commands/report');
const { handleMuteCommand } = require('../commands/mute');
const { handleMemGptRequest } = require('../commands/memgpt');
const { handleOaiRequest } = require('../commands/oai');
const { aliases } = require('../config/aliases');

const commandHandlers = {
    'oai': {
        handler: handleOaiRequest,
        description: 'Interact with OpenAI models. Usage: !oai:[model] [query]'
    },
    'memgpt': {
        handler: handleMemGptRequest,
        description: 'Interacts with the MemGPT service. Usage: !memgpt [query]'
    },
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
        description: 'Sends a query to the Quivr API. Usage: !quivr:[action] [query]'
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
        description: 'Sends a query to the Flowise API or lists available actions if on argument is provided. Usage: !flowise:[action] [query]'
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

function handleAliasCommand(message) {
    let aliasMessage = 'Configured command aliases:\n';
    for (const [alias, command] of Object.entries(aliases)) {
        aliasMessage += `- !${alias}: ${command}\n`;
    }
    message.reply(aliasMessage);
}

function handleHelpCommand(message) {
    let helpMessage = 'Available commands:\n';

    // Explain the new command syntax
    helpMessage += 'Commands can be used with an action using the syntax `!<command>:<action> [args]`. ';
    helpMessage += 'If no action is specified, a default action will be used.\n\n';

    // List all commands and their descriptions
    for (const [command, info] of Object.entries(commandHandlers)) {
        helpMessage += `- !${command}: ${info.description}\n`;
    }

    // Add a section for aliases
    helpMessage += '\nCommand Aliases:\n';
    for (const [alias, command] of Object.entries(aliases)) {
        helpMessage += `- !${alias}: Translates to !${command}\n`;
    }

    // Example usage
    helpMessage += '\nExample Usage:\n';
    helpMessage += '- `!quivr:action query` - Executes the specified action with the query in Quivr.\n';
    helpMessage += '- `!quivr query` - Uses the default Quivr action with the query.\n';
    helpMessage += '- `!web query` - Uses an alias to execute a command with the query.\n';

    message.reply(helpMessage);
}

async function commandHandler(message, commandContent) {
    try {
        console.debug(`Received in commandHandler: ${commandContent}`);

        // Regex to match commands with or without action
        const commandRegex = /(?:@bot\s+)?^!(\w+)(?::(\w+))?\s*(.*)/;
        let matches = commandContent.match(commandRegex);

        if (matches) {
            let command = matches[1].toLowerCase();
            let action = matches[2];
            let args = matches[3];

            console.debug(`[commandHandler] Command: ${command}, Action: ${action}, Args: ${args}`);

            // Check if command is an alias
            if (aliases[command]) {
                let aliasParts = aliases[command].split(':');
                command = aliasParts[0];
                let additionalArgs = aliasParts.slice(1).join(':');

                if (additionalArgs) {
                    additionalArgs += ' '; // Add a space before the user's args if there are additional args
                }
                args = additionalArgs + args;
                console.debug(`[commandHandler] Alias Command: ${command}, Action: ${action}, Args: ${args}`);
            }

            if (commandHandlers[command]) {
                console.debug(`Executing handler for command: ${command}`);
                await commandHandlers[command].handler(message, action, args);
                console.debug(`Executed handler for command: ${command}`);
            } else {
                console.debug(`Unknown command: ${command}`);
                message.reply('Unknown command: ' + command);
            }
        } else {
            console.debug('No command found in the message');
        }

    } catch (error) {
        console.error(`Error while handling command: ${commandContent}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Stack Trace: ${error.stack}`);
        // Log additional error details if available
        if (error.response) {
            console.error(`Error response data: ${JSON.stringify(error.response.data)}`);
            console.error(`Error response status: ${error.response.status}`);
            console.error(`Error response headers: ${JSON.stringify(error.response.headers)}`);
        }
        // Reply to the message with a generic error or specific error message
        message.reply('An error occurred while processing your command.');
    }
}

module.exports = { commandHandler, aliases };
