import { FlowiseClient } from 'flowise-sdk';
import * as dotenv from 'dotenv';
dotenv.config();

(async () => {
  const flowise = new FlowiseClient({ baseUrl: process.env.FLOWISE_API_ENDPOINT });
  const chatflowId = process.env.FLOWISE_CONVERSATION_CHATFLOW_ID;
  const apiKey = process.env.FLOWISE_API_KEY;

  try {
    console.log('Testing Flowise SDK with API key...');
    const response = await flowise.createPrediction({
      chatflowId,
      question: 'Hello, what is your status?',
      overrideConfig: {
        credentials: {
          'openai-api-key': apiKey
        }
      }
    });
    console.log('Response:', response);
  } catch (error) {
    console.error('Error during SDK call:', error);
  }
})();
