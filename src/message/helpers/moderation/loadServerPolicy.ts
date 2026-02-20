import Debug from 'debug';
import fs from 'fs';
import path from 'path';

const debug = Debug('app:loadServerPolicy');

/**
 * Loads the server's moderation policy from a JSON configuration file.
 *
 * This function reads the server policy from a JSON file located in the config directory.
 * It logs the success or failure of loading the policy and throws an error if the policy
 * cannot be loaded.
 *
 * @returns {string} The server policy as a string.
 */
export default function loadServerPolicy(): string {
  try {
    const policyPath = path.resolve(__dirname, '../../config/serverPolicy.json');
    const policyData = fs.readFileSync(policyPath, 'utf-8');
    debug('[loadServerPolicy] Server policy loaded successfully.');
    return policyData;
  } catch (error: any) {
    debug('[loadServerPolicy] Failed to load server policy: ' + error.message);
    throw new Error('Unable to load server policy.');
  }
}
