import { Ai } from '@cloudflare/ai';

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') {
            return new Response('Expected POST', { status: 405 });
        }

        const authHeader = request.headers.get('Authorization');

        // Only check the Authorization header if LLM_API_KEY is defined in the environment variables
        if (env.LLM_API_KEY && (!authHeader || authHeader !== `Bearer ${env.LLM_API_KEY}`)) {
            return new Response('Unauthorized', { status: 401 });
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

        const modelToUse = model || '@cf/mistral/mistral-7b-instruct-v0.1';
        const ai = new Ai(env.AI);
        const chat = { messages: messages };

        console.log('Starting AI processing for model:', modelToUse);

        try {
            const aiResponse = await ai.run(modelToUse, chat);
            let responseContent = aiResponse;

            if (aiResponse && typeof aiResponse === 'object' && 'response' in aiResponse) {
                responseContent = aiResponse.response;
            }

            const responseObj = {
                id: crypto.randomUUID(),
                object: "chat_completion",
                created: Date.now(),
                model: modelToUse,
                choices: [{
                    message: {
                        content: responseContent,
                    },
                    index: 0,
                    logprobs: null,
                    finish_reason: "stopped"
                }],
                usage: {
                    total_tokens: responseContent.length
                }
            };
            
            console.log('AI processing completed for model:', modelToUse);
            return new Response(JSON.stringify(responseObj), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (e) {
            console.error('Error processing request for model:', modelToUse, e);
            return new Response('Error processing request', { status: 500 });
        }
    }
};
