import fs from 'fs';
import path from 'path';
import logger from '@src/utils/logger';

/**
 * Loads the server's moderation policy from a JSON configuration file.
 * 
 * @returns The server policy as a string.
 */
export default function loadServerPolicy(): string {
    try {
        const policyPath = path.resolve(__dirname, '../@config/serverPolicy.json');
        const policyData = fs.readFileSync(policyPath, 'utf-8');
        logger.debug('[loadServerPolicy] Server policy loaded successfully.');
        return policyData;
    } catch (error: any) {
        logger.error('[loadServerPolicy] Failed to load server policy: ' + error.message);
        throw new Error('Unable to load server policy.');
    }
}
