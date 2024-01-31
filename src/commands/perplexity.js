const axios = require('axios');

async function handlePerplexityRequest(message, args) {
    if (!args) {
        message.reply('Please provide a query for Perplexity.');
        return;
    }

    try {
        const messages = [];
        // Optional: Add a system message if system prompt is set
        if (process.env.PERPLEXITY_SYSTEM_PROMPT) {
            messages.push({ role: 'system', content: process.env.PERPLEXITY_SYSTEM_PROMPT });
        }

        // Add the user message
        messages.push({ role: 'user', content: args });

        const perplexityResponse = await axios.post(
            process.env.PERPLEXITY_URL,
            {
                model: process.env.PERPLEXITY_MODEL || 'mistral-7b-instruct',
                messages: messages
                // Optional: Add other parameters like max_tokens, temperature, etc., if needed
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
                }
            }
        );

        if (perplexityResponse.status === 200) {
            const assistantMessage = perplexityResponse.data.choices[0].message.content;
            message.reply(`Perplexity response: ${assistantMessage}`);
        } else {
            console.error(`Error from Perplexity API: ${perplexityResponse.status}`);
            message.reply('An error occurred while processing your Perplexity request.');
        }
    } catch (error) {
        console.error(`Error in handlePerplexityRequest: ${error.message}`);
        message.reply('An error occurred while processing your Perplexity request.');
    }
}

module.exports = { handlePerplexityRequest };

