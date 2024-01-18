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

async function commandHandler(message) {
    const commandRegex = /^!(\w+)\s*/;
    const matches = message.content.match(commandRegex);

    if (matches) {
        const command = matches[1].toLowerCase();
        const args = message.content.replace(commandRegex, '');

        if (commandHandlers[command]) {
            await commandHandlers[command](message, args);
        } else {
            message.reply(`Unknown command: ${command}`);
        }
    }
}

module.exports = { commandHandler };

