// Direct real Discord test without Jest mocking
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN?.split(',')[0];
const DISCORD_CHANNEL = process.env.DISCORD_CHANNEL_ID;

if (!DISCORD_TOKEN || !DISCORD_CHANNEL) {
  console.log('❌ Missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID');
  process.exit(1);
}

async function testRealDiscord() {
  try {
    console.log('🚀 Testing real Discord connection...');
    
    // Import Discord service directly
    const { Discord } = require('./dist/integrations/discord/DiscordService');
    
    // Create service instance
    const service = Discord.DiscordService.getInstance();
    
    console.log('📡 Initializing Discord service...');
    await service.initialize();
    
    const bots = service.getAllBots();
    console.log(`✅ Connected! Found ${bots.length} bot(s)`);
    
    console.log('📤 Sending test message...');
    const messageId = await service.sendMessageToChannel(
      DISCORD_CHANNEL,
      `🧪 Real integration test - ${new Date().toISOString()}`
    );
    
    if (messageId) {
      console.log(`✅ Message sent! ID: ${messageId}`);
    } else {
      console.log('❌ Failed to send message');
    }
    
    console.log('📥 Fetching recent messages...');
    const messages = await service.fetchMessages(DISCORD_CHANNEL, 3);
    console.log(`✅ Fetched ${messages.length} messages`);
    
    console.log('🔌 Shutting down...');
    await service.shutdown();
    
    console.log('🎉 Real Discord integration test PASSED!');
    
  } catch (error) {
    console.error('❌ Real Discord test FAILED:', error.message);
    process.exit(1);
  }
}

testRealDiscord();