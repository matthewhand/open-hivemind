const Command = require('../utils/Command');
const { Ollama } = require('ollama-node');
const { OLLAMA_DEFAULT_MODEL } = require('../config/constants');
const logger = require('../utils/logger');

class OllamaCommand extends Command {
    constructor() {
        super('ollama', 'Generates a response using the Ollama model. Usage: !ollama [message]');
    }

    async execute(message) {
        try {
            const parts = message.content.split(' ');
            const command = parts[0];
            // Extract the specified model or use the default one
            const specifiedModel = command.includes(':') ? command.split(':')[1] : OLLAMA_DEFAULT_MODEL;
            const userMessage = parts.slice(1).join(' ');

            const ollama = new Ollama();
            await ollama.setModel(specifiedModel);

            logger.debug(`Sending request to Ollama with model ${specifiedModel}`);
            const response = await ollama.generate(userMessage);
            message.channel.send(response.output);
        } catch (error) {
            logger.error('Error with OLLAMA:', error);
            message.channel.send('Error processing your request with Ollama.');
        }
    }
}

module.exports = new OllamaCommand();
