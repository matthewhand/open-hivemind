const axios = require('axios');

async function sendLlmRequest(message) {
    try {
        const userMessage = message.content;
        const isMentioned = message.mentions.has(message.client.user.id);

        // If the bot decides to respond, proceed with the request
        const modelToUse = process.env.LLM_MODEL || 'mistral-7b-instruct';

        const requestBody = {
            model: modelToUse,
            messages: [
                { role: 'system', content: process.env.LLM_SYSTEM || 'You are a helpful assistant.' },
                { role: 'user', content: userMessage }
            ]
        };
        const headers = { 'Content-Type': 'application/json' };
        if (process.env.LLM_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
        }
        if (process.env.DEBUG === 'true') {
            console.log('Request payload:', JSON.stringify(requestBody, null, 2));
        }

        await message.channel.sendTyping();

        const response = await axios.post(process.env.LLM_URL, requestBody, { headers: headers });
        
        if (response.status !== 200) {
            console.error('Request failed:', response.statusText);
            if (process.env.DEBUG === 'true') {
                console.error('Response body:', response.data);
            }
            return;
        }
        const responseData = response.data;
        if (responseData && responseData.response) {
            let replyContent = responseData.response;

            // Check if replyContent is a string before calling trim
            if (typeof replyContent === 'string') {
                replyContent = replyContent.trim();
            } else {
                console.error('Expected replyContent to be a string, got:', typeof replyContent);
                replyContent = JSON.stringify(replyContent);  // Convert to string if it's not a string
            }
            
            if (replyContent.length > 2000) {
                const chunks = replyContent.match(/.{1,2000}/g);
                for (let chunk of chunks) {
                    message.reply(chunk);
                }
            } else {
                message.reply(replyContent);
            }
        } else {
            message.reply('No response from the server.');
        }
    } catch (error) {
        // Log detailed error information
        console.error('Error in sendLlmRequest:', error);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(error.response.data);
            console.error(error.response.status);
            console.error(error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error', error.message);
        }
        console.error(error.config);
    }
}

module.exports = { sendLlmRequest };
