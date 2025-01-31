import { getMessageProvider } from '@message/management/getMessageProvider';
import messageConfig from '@src/message/interfaces/messageConfig';

describe('getMessageProvider Integration Test', () => {
  beforeEach(() => {
    jest.resetModules(); // ✅ Ensure fresh module state
    delete process.env.MESSAGE_PROVIDER; // ✅ Reset environment variable
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "discord"', () => {
    process.env.MESSAGE_PROVIDER = 'discord';
    const provider = getMessageProvider();

    console.log('[DEBUG] Returned provider (Discord):', provider);

    expect(provider).toHaveProperty('sendMessageToChannel');
  });

  test('should return an object with sendMessageToChannel when MESSAGE_PROVIDER is "slack"', () => {
    process.env.MESSAGE_PROVIDER = 'slack';
    const provider = getMessageProvider();

    console.log('[DEBUG] Returned provider (Slack):', provider);

    expect(provider).toHaveProperty('sendMessageToChannel');
  });

//   test('should throw an error if MESSAGE_PROVIDER is invalid', () => {
//     process.env.MESSAGE_PROVIDER = 'invalid-provider';

//     // ✅ Instead of `jest.isolateModules`, call `getMessageProvider` directly
//     expect(() => getMessageProvider()).toThrow('Unsupported message provider: invalid-provider');
//   });

//   test('should throw an error if MESSAGE_PROVIDER is missing', () => {
//     delete process.env.MESSAGE_PROVIDER;

//     // ✅ Instead of `jest.isolateModules`, call `getMessageProvider` directly
//     expect(() => getMessageProvider()).toThrow('MESSAGE_PROVIDER is not configured.');
//   });
});
