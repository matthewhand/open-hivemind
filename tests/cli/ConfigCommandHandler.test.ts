import { Command } from 'commander';
import { ConfigCommandHandler } from '../../src/cli/handlers/ConfigCommandHandler';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

// Mock dependencies
jest.mock(
  'chalk',
  () => ({
    default: new Proxy({}, { get: () => () => '' }),
  }),
  { virtual: true }
);
jest.mock('../../src/config/BotConfigurationManager');

describe('ConfigCommandHandler DI', () => {
  it('should accept dependencies via constructor', () => {
    // Create mock instances
    const mockConfigManager = {
      getAllBots: jest.fn().mockReturnValue([]),
    } as unknown as BotConfigurationManager;

    // Instantiate with DI
    const handler = new ConfigCommandHandler(mockConfigManager);

    // Set up a dummy command
    const program = new Command();
    handler.setup(program);

    // Verify it doesn't throw and initializes properly
    expect(handler).toBeInstanceOf(ConfigCommandHandler);
  });
});
