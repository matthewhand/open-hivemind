import Debug from 'debug';

const debug = Debug('app:command:isCommand');

export function isCommand(text: string): boolean {
    const isCmd = text.startsWith('!');
    debug('isCommand: ' + text + ' - ' + isCmd);
    return isCmd;
}
