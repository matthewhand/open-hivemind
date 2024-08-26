import Debug from "debug";

export function isCommand(text: string): boolean {
    const isCmd = text.startsWith('!');
    debug('isCommand: ' + text + ' - ' + isCmd);
    return isCmd;
}
