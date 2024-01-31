const { Ollama } = require('ollama-node');
const { OLLAMA_DEFAULT_MODEL } = require('../config/constants');

async function handleOllamaMessage(message) {
    const parts = message.content.split(' ');
    const command = parts[0];
    const specifiedModel = command.includes(':') ? command.split(':')[1] : OLLAMA_DEFAULT_MODEL;
    const userMessage = parts.slice(1).join(' ');

    const ollama = new Ollama();
    await ollama.setModel(specifiedModel);

    try {
        const response = await ollama.generate(userMessage);
        message.channel.send(response.output);
    } catch (error) {
        console.error('Error with OLLAMA:', error);
        message.channel.send('Error processing your request.');
    }
}

module.exports = { handleOllamaMessage };
