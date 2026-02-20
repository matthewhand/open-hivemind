import {
  checkVotingEligibility,
  startVotingProcess,
} from '../../../../src/message/helpers/moderation/votingUtils';

describe('votingUtils', () => {
  describe('startVotingProcess', () => {
    it('should pass voting process simulation', async () => {
      const result = await startVotingProcess('user-1');
      expect(result).toEqual({ votePassed: true });
    });
  });

  describe('checkVotingEligibility', () => {
    it('should return true for simulation', () => {
      const result = checkVotingEligibility('user-1');
      expect(result).toBe(true);
    });
  });
});
