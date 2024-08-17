// Mock the logger module to prevent actual logging during tests.
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

// Mock process.exit to prevent it from terminating the process during the test.
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`process.exit called with code ${code}`);
});

import DiscordManager from '../../src/managers/DiscordManager';
import logger from '../../src/utils/logger';

describe('DiscordManager Initialization', () => {
    beforeEach(() => {
        // Ensure DISCORD_TOKEN is not set before each test
        delete process.env.DISCORD_TOKEN;
    });

    afterEach(() => {
        // Restore process.exit after each test
        jest.restoreAllMocks();
    });

    it('should log an error and exit when DISCORD_TOKEN is not provided', () => {
        expect(() => {
            // Attempt to create the instance, which should fail due to the missing token
            DiscordManager.getInstance();
        }).toThrow('process.exit called with code 1');

        // Verify that logger.error was called with the appropriate message
        expect(logger.error).toHaveBeenCalledWith(
            'DISCORD_TOKEN is not defined in the configuration. Exiting...'
        );
    });
});
