import axios from 'axios';
import Debug from 'debug';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const debug = Debug('app:flowiseConnectivityTest');

// Fetch environment variables
const apiUrl = process.env.FLOWISE_API_ENDPOINT;
const username = process.env.FLOWISE_USERNAME;
const password = process.env.FLOWISE_PASSWORD;
const apiKey = process.env.FLOWISE_API_KEY;
const chatflowId = process.env.FLOWISE_CONVERSATION_CHATFLOW_ID;

async function testUsernamePasswordAuth() {
  if (!apiUrl || !username || !password) {
    throw new Error('Missing Flowise Username/Password environment variables');
  }

  try {
    const response = await axios.post(`${apiUrl}/auth/login`, {
      username,
      password
    });

    if (response.status === 200 && response.data.token) {
      debug('Username/Password Authentication: Success');
      console.log('Flowise Username/Password Auth Test: Success');
    } else {
      console.error('Flowise Username/Password Auth Test: Failed', response.data);
    }
  } catch (error) {
    console.error('Flowise Username/Password Auth Test: Failed', error);
  }
}

async function testApiKeyAuth() {
  if (!apiUrl || !apiKey || !chatflowId) {
    throw new Error('Missing Flowise API Key or Chatflow ID environment variables');
  }

  try {
    const response = await axios.post(`${apiUrl}/chatflows/${chatflowId}/execute`, {
      question: 'Test API Key Authentication'
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 200 && response.data) {
      debug('API Key Authentication: Success');
      console.log('Flowise API Key Auth Test: Success');
    } else {
      console.error('Flowise API Key Auth Test: Failed', response.data);
    }
  } catch (error) {
    console.error('Flowise API Key Auth Test: Failed', error);
  }
}

async function runTests() {
  await testUsernamePasswordAuth();
  await testApiKeyAuth();
}

runTests();
