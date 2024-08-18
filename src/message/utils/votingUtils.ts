import logger from '../../logging/logger'; // Adjust the import path to match the correct logger utility

/**
 * Manages voting operations such as initiation, recording votes, and determining outcomes.
 */
export class VotingManager {
    private votes: Record<string, { yes: number; no: number }>;

    constructor() {
        this.votes = {};
    }

    /**
     * Initiates a vote for a particular subject (e.g., user ban).
     * @param subject - The subject of the vote.
     */
    public initiateVote(subject: string): void {
        if (!subject) {
            logger.error('[VotingManager.initiateVote] Invalid subject provided.');
            throw new Error('Invalid subject.');
        }

        this.votes[subject] = { yes: 0, no: 0 };
        logger.info('Voting initiated for subject: ' + subject);
    }

    /**
     * Records a vote for a particular subject.
     * @param subject - The subject of the vote.
     * @param vote - The vote, where true is 'yes' and false is 'no'.
     */
    public recordVote(subject: string, vote: boolean): void {
        if (!this.votes[subject]) {
            logger.error('Attempted to vote on non-existent subject: ' + subject);
            throw new Error('Voting subject does not exist.');
        }

        if (vote) {
            this.votes[subject].yes += 1;
        } else {
            this.votes[subject].no += 1;
        }

        logger.info('Vote recorded for subject: ' + subject + ', vote: ' + (vote ? 'yes' : 'no'));
    }

    /**
     * Determines the outcome of the vote for a particular subject.
     * @param subject - The subject of the vote.
     * @returns The outcome of the vote ('yes', 'no', or 'tie').
     */
    public determineOutcome(subject: string): 'yes' | 'no' | 'tie' {
        if (!this.votes[subject]) {
            logger.error('Attempted to determine outcome for non-existent subject: ' + subject);
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
