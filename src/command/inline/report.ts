import { Message, TextChannel, MessageCollector } from 'discord.js';
import { BaseCommand } from '../types/BaseCommand';
import logger from '@src/utils/logger';

export class ReportCommand extends InlineCommand {
    constructor() {
        super('report', 'User reports about issues or rule violations. Usage: !report [text]');
    }

    /**
     * Executes the report command, prompting the user for details and handling the report.
     */
    async execute(args: { message: Message }): Promise<{ success: boolean, message: string, error?: string }> {
        const { message } = args;
        const filter = (m: Message) => m.author.id === message.author.id;

        // Prompt user to describe the issue
        await message.channel.send('Please describe the issue you are reporting within the next 30 seconds:');
        logger.debug(`Prompted ${message.author.tag} to describe the issue.`);

        try {
            // Await user's response with a 30-second timeout
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const reportDescription = collected.first()?.content.toLowerCase();

            logger.debug(`Collected report description: ${reportDescription}`);

            // Check if the report contains specific keywords
            if (reportDescription?.includes('spam') || reportDescription?.includes('harassment')) {
                await this.initiateModeratorVote(message, reportDescription);
            } else {
                await message.channel.send('Thank you for the report. Our team will look into this matter.');
            }
        } catch (error: any) {
            await this.handleErrors(message, error);
        }

        return { success: true, message: 'Report processed successfully.' };
    }

    /**
     * Initiates a moderator vote if the report is of a serious nature.
     */
    private async initiateModeratorVote(message: Message, reportDescription: string): Promise<void> {
        const moderationTeamRole = message.guild?.roles?.cache.find(role => role.name === 'Moderation Team');
        
        // Ensure the moderation role exists
        if (!moderationTeamRole) {
            logger.warn('Moderation Team role not found in the guild.');
            await message.channel.send('Unable to initiate vote. Moderation Team role is missing.');
            return;
        }

        const onlineModerators = moderationTeamRole.members.filter(member => member.presence?.status === 'online');

        // Guard clause if no moderators are online
        if (!onlineModerators.size) {
            await message.channel.send('No online moderators available to initiate a vote.');
            return;
        }

        // Prepare the embed for the moderator vote
        const embed = {
            title: 'Moderation Vote Required',
            description: 'A report has been filed for: ' + reportDescription,
            fields: [{ name: 'Reported by', value: message.author.tag }],
            color: 15105570,  // ORANGE color in decimal
            timestamp: new Date().toISOString(),  // Corrected to use ISO string
        };

        // Find the moderator vote channel
        const moderatorChannel = message.guild?.channels?.cache.find(
            (ch): ch is TextChannel => ch.name === 'moderator-vote' && ch instanceof TextChannel
        );

        // Guard clause if the moderator channel is not found
        if (!moderatorChannel) {
            logger.warn('Moderator vote channel not found.');
            await message.channel.send('Unable to initiate vote. Moderator vote channel is missing.');
            return;
        }

        // Send the embed to the moderator channel
        await moderatorChannel.send({ embeds: [embed] });
        logger.info('Moderator vote initiated.');

        // Collect votes for 1 minute
        const voteCollector = new MessageCollector(moderatorChannel, { time: 60000 });
        voteCollector.on('collect', msg => {
            if (msg.content.toLowerCase() === '!agree' && onlineModerators.has(msg.author.id)) {
                logger.debug(`Vote collected from ${msg.author.tag}: !agree`);
                // Logic to count votes and make a decision
            }
        });

        voteCollector.on('end', () => {
            moderatorChannel.send('Voting ended. Decision: ...');  // Replace with the actual decision
            logger.info('Voting ended.');
        });
    }

    /**
     * Handles errors that occur during the command execution.
     */
    private async handleErrors(message: Message, error: any): Promise<void> {
        if (error.message === 'time') {
            await message.channel.send('You did not provide any report details in time. Please try again.');
            logger.warn('Report timed out without user input.');
        } else {
            logger.error('Error in ReportCommand: ' + error.message);
            await message.channel.send('An error occurred while processing your report. Please try again.');
        }
    }
}
