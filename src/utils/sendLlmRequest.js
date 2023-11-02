const axios = require('axios');

// Initialize outside of the sendLlmRequest function
let responseProbability = 0.1; // 50% chance of responding initially
let lastMentionTime = Date.now(); // Timestamp of the last mention

// Helper function to calculate response probability
function calculateResponseProbability(isMentioned) {
    const currentTime = Date.now();
    const timeSinceLastMention = (currentTime - lastMentionTime) / 1000; // Convert to seconds

    if (isMentioned) {
        responseProbability = 1.0; // Reset to 100% if mentioned
        lastMentionTime = currentTime; // Update the last mention time
    } else {
        // Calculate decay factor based on time since last mention
        const decayFactor = Math.max(0.5, 1 - timeSinceLastMention / (60 * 5)); // Adjust decay factor as needed
        responseProbability *= decayFactor; // Decrease probability based on time since last mention
    }

    return Math.random() > responseProbability; // Return true if bot decides not to respond
}

async function sendLlmRequest(message) {
    try {
        const userMessage = message.content;
        const isMentioned = message.mentions.has(message.client.user.id);

        // Use the helper function to decide whether to respond
        if (calculateResponseProbability(isMentioned)) {
            // Bot decides not to respond
            return;
        }

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

        // Start typing
        message.channel.startTyping();

        const response = await axios.post(process.env.LLM_URL, requestBody, { headers: headers });
        
        // Stop typing
        message.channel.stopTyping();

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
        // Stop typing in case of error
        message.channel.stopTyping();
        console.error('Error in sendLlmRequest:', error.message);
    }
}

module.exports = { sendLlmRequest };