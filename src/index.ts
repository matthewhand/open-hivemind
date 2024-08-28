import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:index');
const configManager = new ConfigurationManager();

export async function main() {
    try {
        const clientId = configManager.DISCORD_CLIENT_ID || 'UNCONFIGURED_DISCORD_CLIENT_ID';
        debug('Client ID:', clientId);

        // Further logic and initialization
    } catch (error) {
        debug('Failed to start Discord service:', error.message);
    }
}

main();
