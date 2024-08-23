import { GuildMember } from 'discord.js';

export async function handleUserCommand(interaction: any): Promise<string> {
    const user = interaction.user.username;
    const member = interaction.member as GuildMember | null;

    const joinDate = member ? member.joinedAt?.toDateString() || 'unknown' : 'unknown';

    return 'This command was run by ' + user + ', who joined on ' + joinDate + '.';
}
