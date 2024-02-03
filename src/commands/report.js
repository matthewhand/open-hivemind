const logger = require('../utils/logger');

const data = {
    name: 'report',
    description: 'User reports about issues or rule violations. Usage: !report'
};

async function execute(message) {
    // Ask the user for details about the report
    const filter = m => m.author.id === message.author.id;
    message.channel.send('Please describe the issue you are reporting within the next 30 seconds:');

    try {
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const reportDescription = collected.first().content.toLowerCase();

        // Simple keyword-based analysis for report content
        if (reportDescription.includes('spam') || reportDescription.includes('harassment')) {
            message.channel.send('It seems like a serious issue. Consider using `!ban @username` to initiate a ban.');
        } else if (reportDescription.includes('bug') || reportDescription.includes('glitch')) {
            message.channel.send('Thank you for reporting a technical issue. Our team will investigate this matter.');
        } else {
            message.channel.send('Thank you for the report. We will look into this matter.');
        }
    } catch (error) {
        if (error.message === 'time') {
            message.channel.send('You did not provide any report details in time. Please try again.');
        } else {
            logger.error(`Error in handleReportCommand: ${error.message}`);
            message.channel.send('An error occurred while processing your report. Please try again.');
        }
    }
}

module.exports = { data, execute };
