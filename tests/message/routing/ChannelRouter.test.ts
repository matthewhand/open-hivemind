import messageConfig from '../../../src/config/messageConfig';
import {
  computeScore,
  getBonusForChannel,
  // Actually it is not exported. I will test via getChannelBonuses/Priorities quirks or see if I can export it for testing?
  // The previous view_file showed it as non-exported function.
  // I will test public API: getChannelBonuses, getChannelPriorities, computeScore, pickBestChannel
  getChannelBonuses,
  getChannelPriorities,
  getPriorityForChannel,
  parseKeyNumberMap, // Not exported but tested via usage if internal, or needs export?
  pickBestChannel,
} from '../../../src/message/routing/ChannelRouter';

jest.mock('../../../src/config/messageConfig', () => ({
  get: jest.fn(),
}));

describe('ChannelRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Config Parsing (Bonuses & Priorities)', () => {
    it('should parse object map for bonuses', () => {
      (messageConfig.get as jest.Mock).mockReturnValue({ C1: 1.5, C2: 0.5 });
      const bonuses = getChannelBonuses();
      expect(bonuses).toEqual({ C1: 1.5, C2: 0.5 });
    });

    it('should parse CSV string for bonuses', () => {
      (messageConfig.get as jest.Mock).mockReturnValue('C1:1.2, C2:0.8');
      const bonuses = getChannelBonuses();
      expect(bonuses).toEqual({ C1: 1.2, C2: 0.8 });
    });

    it('should ignore invalid bonuses (outside 0-2 range)', () => {
      (messageConfig.get as jest.Mock).mockReturnValue({ C1: 2.5, C2: -0.1, C3: 1.0 });
      const bonuses = getChannelBonuses();
      expect(bonuses).toEqual({ C3: 1.0 });
    });

    it('should parse integer priorities', () => {
      (messageConfig.get as jest.Mock).mockReturnValue({ C1: 1, C2: 0 });
      const priorities = getChannelPriorities();
      expect(priorities).toEqual({ C1: 1, C2: 0 });
    });

    it('should ignore non-integer priorities', () => {
      (messageConfig.get as jest.Mock).mockReturnValue('C1:1.5, C2:2');
      const priorities = getChannelPriorities();
      expect(priorities).toEqual({ C2: 2 });
    });
  });

  describe('Scoring Logic', () => {
    it('should compute score with defaults', () => {
      (messageConfig.get as jest.Mock).mockReturnValue({});
      const score = computeScore('C1');
      // base 1.0 * bonus 1.0 / (1 + priority 0) = 1.0
      expect(score).toBe(1.0);
    });

    it('should compute score with bonus and priority', () => {
      // Mock separate calls? getChannelBonuses calls get('CHANNEL_BONUSES')
      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'CHANNEL_BONUSES') return { C1: 1.5 };
        if (key === 'CHANNEL_PRIORITIES') return { C1: 1 }; // Priority 1 => divider 2
        return null;
      });

      const score = computeScore('C1');
      // 1.0 * 1.5 / (1 + 1) = 0.75
      expect(score).toBe(0.75);
    });
  });

  describe('pickBestChannel', () => {
    it('should return null for empty list', () => {
      expect(pickBestChannel([])).toBeNull();
    });

    it('should pick highest score', () => {
      // C1=0.75, C2=2.0 (High Bonus, Low Priority)
      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'CHANNEL_BONUSES') return { C1: 1.5, C2: 2.0 }; // C2 max bonus
        if (key === 'CHANNEL_PRIORITIES') return { C1: 1, C2: 0 }; // C2 best priority
        return {};
      });
      // C1 score: 0.75
      // C2 score: 2.0 * 1.0 / 1 = 2.0
      expect(pickBestChannel(['C1', 'C2'])).toBe('C2');
    });

    it('should break ties via bonus', () => {
      // Tie score:
      // C1: Bonus 2.0, Priority 1 => 2.0 / 2 = 1.0
      // C2: Bonus 1.0, Priority 0 => 1.0 / 1 = 1.0
      // Tie!
      // Winner should be C1 (higher bonus 2.0 vs 1.0)
      (messageConfig.get as jest.Mock).mockImplementation((key) => {
        if (key === 'CHANNEL_BONUSES') return { C1: 2.0, C2: 1.0 };
        if (key === 'CHANNEL_PRIORITIES') return { C1: 1, C2: 0 };
        return {};
      });
      expect(pickBestChannel(['C1', 'C2'])).toBe('C1');
    });

    it('should break ties via ID (lexicographic)', () => {
      // Exact same parameters
      (messageConfig.get as jest.Mock).mockReturnValue({});
      // C1 vs C2. Bonus 1.0, Priority 0. Score 1.0.
      // Lexicographic: C1 < C2. So C1 wins.
      expect(pickBestChannel(['C2', 'C1'])).toBe('C1');
    });
  });
});
