import ConfigurationManager from '@config/ConfigurationManager';
import Alias from '@command/interfaces/ICommand';

export function reconstructCommandFromAlias(alias: string): string | null {
    const aliases: Record<string, Alias> = ConfigurationManager.getConfig('aliases', {});
    const foundAlias = aliases[alias];
    if (!foundAlias) {
        return null;
    }
    const command = foundAlias.command || "";

    if (!command || !command) {
        return null;
    }

    return command + ' ' + command;
}
