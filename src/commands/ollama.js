const { Ollama } = require('ollama-node');
const { OLLAMA_DEFAULT_MODEL } = require('../config/constants');
const logger = require('../utils/logger');

const data = {
    name: 'ollama',
    description: 'Generates a response using the Ollama model. Usage: !ollama [message]'
};

async function execute(message) {
    const parts = message.content.split(' ');
    const command = parts[0];
    // Extract the specified model or use the default one
    const specifiedModel = command.includes(':') ? command.split(':')[1] : OLLAMA_DEFAULT_MODEL;
    const userMessage = parts.slice(1).join(' ');

    const ollama = new Ollama();
    await ollama.setModel(specifiedModel);

    try {
        logger.debug(`Sending request to Ollama with model ${specifiedModel}`);
        const response = await ollama.generate(userMessage);
        message.channel.send(response.output);
    } catch (error) {
        logger.error('Error with OLLAMA:', error);
        message.channel.send('Error processing your request with Ollama.');
    }
}

module.exports = { data, execute };
