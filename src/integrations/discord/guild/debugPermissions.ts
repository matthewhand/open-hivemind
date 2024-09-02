import { Client, PermissionsBitField } from 'discord.js';
import Debug from 'debug';

const log = Debug('app:debugPermissions');

/**
 * Debugs and logs the bot's permissions in each guild it is part of.
 * 
 * @param client - The Discord client instance to check permissions for.
 */
export const debugPermissions = async (client: Client): Promise<void> => {
    client.guilds.cache.forEach(guild => {
        const botMember = guild.members.cache.get(client.user?.id!);
        if (!botMember) {
            log(`Bot not found in guild: ${guild.name}`);
            return;
        }

        const permissions = botMember.permissions;
        const requiredPermissions = [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.ReadMessageHistory,
        ];

        requiredPermissions.forEach(permission => {
            if (!permissions.has(permission)) {
                log(`Bot lacks permission ${permission.toString()} in guild: ${guild.name}`);
            }
        });

        log(`Permissions in guild "${guild.name}":`, permissions.toArray().map(perm => perm.toString()));
    });
};
