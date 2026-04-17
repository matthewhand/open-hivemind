import 'reflect-metadata';
import { SwarmCoordinator } from '../../../src/services/SwarmCoordinator';

describe('SwarmCoordinator Integration', () => {
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    SwarmCoordinator.resetInstance();
    coordinator = SwarmCoordinator.getInstance();
    coordinator.clearCache();
  });

  describe('Exclusive Mode', () => {
    it('should allow only one bot to claim a message', () => {
      const decision1 = coordinator.decide('msg-1', 'BotA', 'chan-1', 'exclusive');
      const decision2 = coordinator.decide('msg-1', 'BotB', 'chan-1', 'exclusive');
      
      expect(decision1.shouldReply).toBe(true);
      expect(decision1.claimedBy).toBe('BotA');
      
      expect(decision2.shouldReply).toBe(false);
      expect(decision2.claimedBy).toBe('BotA');
    });

    it('should allow the owner to re-claim', () => {
      coordinator.decide('msg-1', 'BotA', 'chan-1', 'exclusive');
      const decision = coordinator.decide('msg-1', 'BotA', 'chan-1', 'exclusive');
      expect(decision.shouldReply).toBe(true);
    });
  });

  describe('Rotating Mode', () => {
    it('should rotate turns among active bots in a channel', () => {
      // Register bots as active for the channel
      coordinator.decide('init-1', 'BotA', 'chan-1', 'rotating');
      coordinator.decide('init-2', 'BotB', 'chan-1', 'rotating');

      // With 2 bots, turns are 0, 1, 2, 3...
      // msg-1: turn 2 (2 % 2 = 0) -> BotA
      // msg-2: turn 3 (3 % 2 = 1) -> BotB
      const d1 = coordinator.decide('msg-1', 'BotA', 'chan-1', 'rotating');
      const d2 = coordinator.decide('msg-2', 'BotB', 'chan-1', 'rotating');
      
      expect(d1.shouldReply).toBe(true);
      expect(d2.shouldReply).toBe(true);
    });
  });

  describe('Priority Mode', () => {
    it('should let the first bot claim if no higher priority exists', () => {
      const d1 = coordinator.decide('msg-1', 'BotA', 'chan-1', 'priority', 10);
      const d2 = coordinator.decide('msg-1', 'BotB', 'chan-1', 'priority', 20);
      
      expect(d1.shouldReply).toBe(true);
      // Currently, priority doesn't override existing claim in SwarmCoordinator.ts logic
      expect(d2.shouldReply).toBe(false); 
    });
  });

  describe('Collaborative Mode', () => {
    it('should allow all bots to contribute and track them', () => {
      const d1 = coordinator.decide('msg-1', 'BotA', 'chan-1', 'collaborative');
      const d2 = coordinator.decide('msg-1', 'BotB', 'chan-1', 'collaborative');
      
      expect(d1.shouldReply).toBe(true);
      expect(d2.shouldReply).toBe(true);
      
      expect(coordinator.getCollaborators('msg-1')).toContain('BotA');
      expect(coordinator.getCollaborators('msg-1')).toContain('BotB');
    });
  });

  describe('Events', () => {
    it('should emit events when claims are created and released', (done) => {
      coordinator.on('claim:created', (claim) => {
        expect(claim.messageId).toBe('msg-event');
        expect(claim.botId).toBe('BotE');
        done();
      });
      
      coordinator.decide('msg-event', 'BotE', 'chan-1', 'exclusive');
    });
  });
});
