import { Command } from 'commander';
import { DatabaseCommandHandler } from '../../src/cli/handlers/DatabaseCommandHandler';
import { DatabaseManager } from '../../src/database/DatabaseManager';

// Mock dependencies
jest.mock(
  'chalk',
  () => ({
    default: new Proxy({}, { get: () => () => '' }),
  }),
  { virtual: true }
);
jest.mock('../../src/database/DatabaseManager');

describe('DatabaseCommandHandler DI', () => {
  it('should accept dependencies via constructor', () => {
    // Create mock instances
    const mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as DatabaseManager;

    // Instantiate with DI
    const handler = new DatabaseCommandHandler(mockDbManager);

    // Set up a dummy command
    const program = new Command();
    handler.setup(program);

    // Verify it doesn't throw and initializes properly
    expect(handler).toBeInstanceOf(DatabaseCommandHandler);
  });
});
