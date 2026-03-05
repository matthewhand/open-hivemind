export const get = jest.fn((key: string) => {
  switch (key) {
    case 'IDLE_RESPONSE':
      return {
        enabled: true,
        minDelay: 1000,
        maxDelay: 2000,
        prompts: ['Test prompt 1', 'Test prompt 2', 'Test prompt 3'],
      };
    case 'test-messenger':
      return {
        MESSAGE_USERNAME_OVERRIDE: 'TestBot',
      };
    default:
      return {};
  }
});
