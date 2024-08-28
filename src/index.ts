import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:index');
const configManager = new ConfigurationManager();

/**
 * Entry point for the application.
 * Initializes the Discord service and manages configuration setup.
 */
export async function main() {
    try {
        const clientId = configManager.DISCORD_CLIENT_ID || 'UNCONFIGURED_DISCORD_CLIENT_ID';
        debug('Client ID:', clientId);

        // Further logic and initialization
    } catch (error) {
        // Safely handle the error by checking its type
        if (error instanceof Error) {
            debug('Failed to start Discord service:', error.message);
        } else {
            debug('Failed to start Discord service:', 'Unknown error');
        }
    }
}

main();
