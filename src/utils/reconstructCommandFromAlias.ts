// Import the aliases configuration from the config directory
import { aliases } from '@config/aliases';

// Define the expected structure of an Alias if it's not a string.
interface Alias {
    command: string;
    // Add any other properties here if needed
}

/**
 * Reconstructs a command from its alias.
 * @param alias - The alias to look up.
 * @returns The full command string if found, or null if not found.
 */
export function reconstructCommandFromAlias(alias: string): string | null {
    const foundAlias = aliases[alias] as Alias | undefined;

    if (foundAlias && typeof foundAlias.command === "string") {
        return foundAlias.command;  // Return the string command
    } else {
        console.warn("Alias '" + alias + "' not found or invalid.");
        return null;
    }
}
