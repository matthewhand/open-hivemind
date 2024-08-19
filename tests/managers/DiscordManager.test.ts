import DiscordManager from '@discord/DiscordManager';
import logger from '../../src/utils/logger';

describe('DiscordManager Initialization', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(logger, 'error').mockImplementation(() => {});
        jest.spyOn(logger, 'info').mockImplementation(() => {});

        // Adjusting the mock to fit the type signature of process.exit
        jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
            throw new Error(`process.exit called with code ${code}`);
        });
    });

    it('should log an error and exit when DISCORD_TOKEN is not provided', () => {
        delete process.env.DISCORD_TOKEN;

        expect(() => {
            DiscordManager.getInstance().initialize();
        }).toThrow('process.exit called with code 1');

        expect(logger.error).toHaveBeenCalledWith('DiscordManager: DISCORD_TOKEN is not set, exiting process with code 1');
    });
});
