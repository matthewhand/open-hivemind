const logger = require('./logger'); // Assumed logger utility

class VotingManager {
    constructor() {
        this.votes = {};
    }

    /**
     * Initiates a vote for a particular subject (e.g., user ban).
     * @param {string} subject - The subject of the vote.
     */
    initiateVote(subject) {
        this.votes[subject] = { yes: 0, no: 0 };
        logger.info(`Voting initiated for subject: ${subject}`);
    }

    /**
     * Records a vote for a particular subject.
     * @param {string} subject - The subject of the vote.
     * @param {boolean} vote - The vote, where true is 'yes' and false is 'no'.
     */
    recordVote(subject, vote) {
        if (!this.votes[subject]) {
            logger.error(`Attempted to vote on non-existent subject: ${subject}`);
            throw new Error('Voting subject does not exist.');
        }

        if (vote) {
            this.votes[subject].yes += 1;
        } else {
            this.votes[subject].no += 1;
        }

        logger.info(`Vote recorded for subject: ${subject}, vote: ${vote ? 'yes' : 'no'}`);
    }

    /**
     * Determines the outcome of the vote for a particular subject.
     * @param {string} subject - The subject of the vote.
     * @returns {string} - The outcome of the vote ('yes', 'no', or 'tie').
     */
    determineOutcome(subject) {
        if (!this.votes[subject]) {
            logger.error(`Attempted to determine outcome for non-existent subject: ${subject}`);
            throw new Error('Voting subject does not exist.');
        }

        const { yes, no } = this.votes[subject];
        if (yes > no) {
            return 'yes';
        } else if (no > yes) {
            return 'no';
        } else {
            return 'tie';
        }
    }
}

module.exports = { VotingManager };
