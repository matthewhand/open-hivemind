const Command = require('../../utils/Command');
const logger = require('../../utils/logger');
const { MessageEmbed, MessageCollector } = require('discord.js');

class ReportCommand extends Command {
    constructor() {
        super('report', 'User reports about issues or rule violations. Usage: !report');
    }

    async execute(message) {
        const filter = m => m.author.id === message.author.id;
        message.channel.send('Please describe the issue you are reporting within the next 30 seconds:');

        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const reportDescription = collected.first().content.toLowerCase();

            if (reportDescription.includes('spam') || reportDescription.includes('harassment')) {
                this.initiateModeratorVote(message, reportDescription);
            } else {
                message.channel.send('Thank you for the report. Our team will look into this matter.');
            }
        } catch (error) {
            this.handleErrors(message, error);
        }
    }

    async initiateModeratorVote(message, reportDescription) {
        const moderationTeamRole = message.guild.roles.cache.find(role => role.name === 'Moderation Team'); // Adjust the role name accordingly
        const onlineModerators = moderationTeamRole.members.filter(member => member.presence.status === 'online');
    
        if (onlineModerators.size === 0) {
            message.channel.send('No online moderators available to initiate a vote.');
            return;
        }
    
        const embed = new MessageEmbed()
            .setTitle('Moderation Vote Required')
            .setDescription(`A report has been filed for: ${reportDescription}`)
            .addField('Reported by', message.author.tag)
            .setColor('ORANGE')
            .setTimestamp();
    
        const moderatorChannel = message.guild.channels.cache.find(ch => ch.name === 'moderator-vote'); // Adjust the channel name accordingly
        const voteMessage = await moderatorChannel.send({ embeds: [embed] });
    
        const voteCollector = new MessageCollector(moderatorChannel, {
            time: 60000 // 1 minute voting duration
        });
    
        voteCollector.on('collect', msg => {
            if (msg.content.toLowerCase() === '!agree' && onlineModerators.has(msg.author.id)) {
                // Count the vote
                // Implement the logic to count votes and make a decision
                // For example, if all online moderators agree, take action
            }
        });
    
        voteCollector.on('end', collected => {
            // Check the voting result and take action accordingly
            // For example, send a message to the channel with the decision
            moderatorChannel.send('Voting ended. Decision: ...'); // Replace with the actual decision
        });
    }

    handleErrors(message, error) {
        if (error.message === 'time') {
            message.channel.send('You did not provide any report details in time. Please try again.');
        } else {
            logger.error(`Error in ReportCommand: ${error.message}`);
            message.channel.send('An error occurred while processing your report. Please try again.');
        }
    }
}

module.exports = new ReportCommand();
