// Deploy to CloudFlare to create a LLM http endpoint
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

        if (!model || !messages) {
            return new Response('Missing model or messages in request', { status: 400 });
        }

        const ai = new Ai(env.AI);

        const chat = {
            messages: messages
        };

        console.log('Starting AI processing for model:', model);

        try {
            const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', chat);
            const uuid = crypto.randomUUID();
            const responseObj = {
                id: uuid,
                model: model,
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
                        content: ""
                    }
                }]
            };

            console.log('AI processing completed for model:', model, 'with UUID:', uuid);

            return new Response(JSON.stringify(responseObj), { status: 200, headers: { "Content-Type": "application/json" } });
        } catch (e) {
            console.error('Error processing request for model:', model, e);
            return new Response('Error processing request', { status: 500 });
        }
    }
};
