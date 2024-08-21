// Import the aliases configuration from the config directory
import { aliases } from '@config/aliases';

/**
 * Reconstructs a command from its alias.
 * @param alias - The alias to look up.
 * @returns The full command string if found, or null if not found.
 */
export function reconstructCommandFromAlias(alias: string): string | null {
    if (aliases.hasOwnProperty(alias)) {
        return aliases[alias];
    } else {
        console.warn('Alias not found.');
        return null;
    }
}
