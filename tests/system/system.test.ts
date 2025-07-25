import 'dotenv/config';
import { getLlmProvider } from '@llm/getLlmProvider';

// Conditionally run this test suite
const describeOrSkip = process.env.RUN_SYSTEM_TESTS === 'true' 
  ? describe 
  : describe.skip;

describeOrSkip('System Test', () => {
  let messengerService: any;

  // Set a longer timeout for network calls
  jest.setTimeout(30000); 

  beforeAll(async () => {
    const provider = process.env.MESSAGE_PROVIDER?.toLowerCase();
    
    if (provider === 'discord') {
      // Dynamic import to avoid issues when discord.js is not available
      const { Discord } = await import('@integrations/discord/DiscordService');
      messengerService = Discord.DiscordService.getInstance();
    } else if (provider === 'slack') {
      // Dynamic import to avoid issues when slack dependencies are not available
      const { SlackService } = await import('@integrations/slack/SlackService');
      messengerService = SlackService.getInstance();
    } else {
      throw new Error(`System test not configured for MESSAGE_PROVIDER: '${provider}'. Please set it to 'discord' or 'slack'.`);
    }

    // If the service is Slack, it needs an Express app instance
    if (provider === 'slack' && typeof (messengerService as any).setApp === 'function') {
        const express = require('express');
        const app = express();
        (messengerService as any).setApp(app);
    }
    
    // Initialize the real service
    await messengerService.initialize();
  });

  afterAll(async () => {
    // Gracefully shut down the service
    if (messengerService && typeof messengerService.shutdown === 'function') {
      await messengerService.shutdown();
    }
  });

  test('should post a message to the configured default channel', async () => {
    const channelId = messengerService.getDefaultChannel();

    if (!channelId) {
      throw new Error(
        'No default channel ID is configured for the messenger provider. Please set DISCORD_DEFAULT_CHANNEL_ID or SLACK_DEFAULT_CHANNEL_ID in your .env file.'
      );
    }
    
    console.log(`System Test: Attempting to send a message to channel: ${channelId}`);
    const llmProvider = getLlmProvider()[0];
    const llmResponse = await llmProvider.generateChatCompletion(
      "Write a haiku about software testing.",
      [],
      { channelId: channelId }
    );
    console.log(`DEBUG: llmResponse = '${llmResponse}'`);
    const isErrorResponse = llmResponse.includes("There was an error communicating with the AI service.");
    console.log(`DEBUG: isErrorResponse = ${isErrorResponse}`);
    if (isErrorResponse) {
      throw new Error(`LLM failed to generate a proper response. LLM says: ${llmResponse}. Test aborted.`);
    }
    const testMessage = `✅ System test executed successfully at: ${new Date().toLocaleString()}. LLM says:
${llmResponse}`;

    const messageId = await messengerService.sendMessageToChannel(channelId, testMessage);

    // Assert that a message ID was returned, confirming the message was sent
    expect(messageId).toBeTruthy();
    console.log(`System test message sent successfully to channel ${channelId} with ID: ${messageId}`);
  });
});
