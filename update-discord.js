const fs = require('fs');
const filepath = 'packages/adapter-discord/src/managers/DiscordMessageSender.ts';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  /webSocketService\?\.recordMessageFlow\(\{\n\s*botName: botInfo\.botUserName,\n\s*provider: 'discord',\n\s*channelId: selectedChannelId,\n\s*userId: '',\n\s*messageType: 'outgoing',\n\s*contentLength: \(text \|\| ''\)\.length,\n\s*status: 'success',\n\s*\}\);/g,
  `webSocketService?.recordMessageFlow({
          botName: botInfo.botUserName,
          provider: 'discord',
          channelId: selectedChannelId,
          userId: '',
          messageType: 'outgoing',
          contentLength: (text || '').length,
          processingTime: Date.now() - t0,
          status: 'success',
        });`
);

// We need to define t0
if (!content.includes('const t0 = Date.now();')) {
  content = content.replace(
    /const botInfo =\n\s*\(senderName && isSnowflake\(senderName\)/g,
    `const t0 = Date.now();\n    const botInfo =\n      (senderName && isSnowflake(senderName)`
  );
}

fs.writeFileSync(filepath, content);
console.log('Updated Discord adapter.');
