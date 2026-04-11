import { SwarmCoordinator } from '../../../src/services/SwarmCoordinator';

describe('SwarmCoordinator', () => {
  let coordinator: SwarmCoordinator;

  beforeEach(() => {
    coordinator = SwarmCoordinator.getInstance();
    coordinator.clearCache();
  });

  it('should return true when a new message is claimed', () => {
    expect(coordinator.claimMessage('msg-1', 'BotA')).toBe(true);
  });

  it('should return true when the same bot claims the same message again', () => {
    coordinator.claimMessage('msg-1', 'BotA');
    expect(coordinator.claimMessage('msg-1', 'BotA')).toBe(true);
  });

  it('should return false when a different bot tries to claim an already claimed message', () => {
    coordinator.claimMessage('msg-1', 'BotA');
    expect(coordinator.claimMessage('msg-1', 'BotB')).toBe(false);
  });

  it('should be able to get the claim of a message', () => {
    coordinator.claimMessage('msg-1', 'BotA');
    expect(coordinator.getClaim('msg-1')).toBe('BotA');
  });

  it('should return undefined when getting claim of an unknown message', () => {
    expect(coordinator.getClaim('msg-unknown')).toBeUndefined();
  });
});
