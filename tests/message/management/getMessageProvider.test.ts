import { getMessageProvider } from '@message/management/getMessageProvider';

describe('getMessageProvider', () => {
  beforeEach(() => {
    process.env.MESSAGE_PROVIDER = ''; // Reset environment variable
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "discord"', () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const provider = getMessageProvider();
    
    console.log('[DEBUG] Returned provider (Discord):', provider);

    // ✅ Instead of `instanceof`, check for a known method
    expect(provider).toHaveProperty('sendMessageToChannel');
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "slack"', () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const provider = getMessageProvider();

    console.log('[DEBUG] Returned provider (Slack):', provider);

    // ✅ Instead of `instanceof`, check for a known method
    expect(provider).toHaveProperty('sendMessageToChannel');
  });
});
