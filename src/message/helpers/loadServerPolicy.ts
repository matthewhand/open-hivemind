import fs from 'fs';
import path from 'path';

/**
 * Loads the server's moderation policy from a JSON configuration file.
 * 
 * @returns The server policy as a string.
 */
export default function loadServerPolicy(): string {
    try {
        const policyPath = path.resolve(__dirname, '../@config/serverPolicy.json');
        const policyData = fs.readFileSync(policyPath, 'utf-8');
        debug.debug('[loadServerPolicy] Server policy loaded successfully.');
        return policyData;
    } catch (error: any) {
        debug.error('[loadServerPolicy] Failed to load server policy: ' + error.message);
        throw new Error('Unable to load server policy.');
    }
}
