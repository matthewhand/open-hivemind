// Simple real test using existing bot startup
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN?.split(',')[0];
const DISCORD_CHANNEL = process.env.DISCORD_CHANNEL_ID;

console.log('🔍 Environment check:');
console.log('DISCORD_BOT_TOKEN:', DISCORD_TOKEN ? '✅ Found' : '❌ Missing');
console.log('DISCORD_CHANNEL_ID:', DISCORD_CHANNEL ? '✅ Found' : '❌ Missing');

if (!DISCORD_TOKEN || !DISCORD_CHANNEL) {
  console.log('❌ Missing required environment variables');
  process.exit(1);
}

async function testDiscord() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ]
  });

  try {
    console.log('🚀 Connecting to Discord...');
    
    await client.login(DISCORD_TOKEN);
    console.log('✅ Connected to Discord!');
    
    const channel = await client.channels.fetch(DISCORD_CHANNEL);
    if (!channel || !channel.isTextBased()) {
      throw new Error('Channel not found or not text-based');
    }
    
    console.log(`📤 Sending test message to #${channel.name}...`);
    const message = await channel.send(`🧪 Real integration test - ${new Date().toISOString()}`);
    console.log(`✅ Message sent! ID: ${message.id}`);
    
    console.log('📥 Fetching recent messages...');
    const messages = await channel.messages.fetch({ limit: 3 });
    console.log(`✅ Fetched ${messages.size} messages`);
    
    console.log('🔌 Disconnecting...');
    await client.destroy();
    
    console.log('🎉 REAL DISCORD INTEGRATION TEST PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await client.destroy();
    process.exit(1);
  }
}

testDiscord();