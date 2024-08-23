import { ConfigurationManager } from '@src/common/config/ConfigurationManager';
import { Alias } from '@src/command/interfaces/ICommand';

export function reconstructCommandFromAlias(alias: string): string | null {
    const aliases: Record<string, Alias> = ConfigurationManager.getConfig('aliases');
    const foundAlias = aliases[alias];
    if (!foundAlias) {
        return null;
    }
    const [command, action] = foundAlias.split(':');
    return `${command} ${action}`;
}
