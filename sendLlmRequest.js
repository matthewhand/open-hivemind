const axios = require('axios');

async function sendLlmRequest(message) {
    try {
        const userMessage = message.content;
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
        const response = await axios.post(process.env.LLM_URL, requestBody, { headers: headers });
        if (response.status !== 200) {
            console.error('Request failed:', response.statusText);
            if (process.env.DEBUG === 'true') {
                console.error('Response body:', response.data);
            }
            return;
        }
        const responseData = response.data;
if (responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message && responseData.choices[0].message.content) {
    let replyContent = responseData.choices[0].message.content;
    
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
        console.error('Error in sendLlmRequest:', error.message);
    }
}

module.exports = { sendLlmRequest };
