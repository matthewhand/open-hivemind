import { Command } from 'commander';
import { BotCommandHandler } from '../../src/cli/handlers/BotCommandHandler';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';
import { DatabaseManager } from '../../src/database/DatabaseManager';

// Mock dependencies
jest.mock(
  'chalk',
  () => ({
    default: new Proxy({}, { get: () => () => '' }),
  }),
  { virtual: true }
);
jest.mock('../../src/config/BotConfigurationManager');
jest.mock('../../src/database/DatabaseManager');

describe('BotCommandHandler DI', () => {
  it('should accept dependencies via constructor', () => {
    // Create mock instances
    const mockConfigManager = {
      getAllBots: jest.fn().mockReturnValue([]),
    } as unknown as BotConfigurationManager;

    const mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as DatabaseManager;

    // Instantiate with DI
    const handler = new BotCommandHandler(mockConfigManager, mockDbManager);

    // Set up a dummy command
    const program = new Command();
    handler.setup(program);

    // Verify it doesn't throw and initializes properly
    expect(handler).toBeInstanceOf(BotCommandHandler);
  });
});
