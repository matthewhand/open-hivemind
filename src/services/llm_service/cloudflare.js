import { Ai } from './vendor/@cloudflare/ai.js';

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return new Response('Expected POST', { status: 405 });
        }

        let requestBody;
        try {
            requestBody = await request.json();
        } catch (e) {
            return new Response('Invalid JSON', { status: 400 });
        }

        const { model, messages } = requestBody;

        if (!Array.isArray(messages) || messages.length === 0) {
            return new Response('Missing or invalid messages in request', { status: 400 });
        }

        // Use the model from the request if provided, otherwise default to '@cf/meta/llama-2-7b-chat-int8'
        const modelToUse = model || '@cf/meta/llama-2-7b-chat-int8';

        const ai = new Ai(env.AI);

        const chat = {
            messages: messages
        };

        console.log('Starting AI processing for model:', modelToUse);

        try {
            const response = await ai.run(modelToUse, chat);  // Use the modelToUse variable here
            const uuid = crypto.randomUUID();
            const responseObj = {
                id: uuid,
                model: modelToUse,
                created: Date.now(),
                object: "chat.completion",
                choices: [{
                    index: 0,
                    finish_reason: "stop",
                    message: {
                        role: "assistant",
                        content: response  // Assuming `response` is a string with the reply
                    },
                    delta: {
                        role: "assistant",
                        content: "LLM did not return a response"
                    }
                }]
            };

            console.log('AI processing completed for model:', modelToUse, 'with UUID:', uuid);

            return new Response(JSON.stringify(responseObj), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (e) {
            console.error('Error processing request for model:', modelToUse, e);
            return new Response('Error processing request', { status: 500 });
        }
    }
};
