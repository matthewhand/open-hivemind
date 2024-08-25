interface CommandDetails {
    command: string;
    args: string[];
}
/**
 * Parses the command and its arguments from the given text.
 * @param {string} text - The text containing the command to parse.
 * @returns {CommandDetails | null} - Returns an object with `command` and `args` if the command is valid, otherwise null.
 */
export function parseCommandDetails(text: string): CommandDetails | null {
    const match = text.match(/^!(\w+)\s*(.*)/);
    if (!match) {
        debug(`parseCommandDetails: Invalid command format - ${text}`);
        return null;
    }
    const command = match[1].toLowerCase();
    const args = match[2] ? match[2].split(/\s+/) : [];
    debug.debug(`parseCommandDetails: command - ${command}  args - [${args.join(', ')}]`);
    return { command, args };
}
