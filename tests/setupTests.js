// Removed global mock for @config/messageConfig to allow real convict-based parsing in tests that reload the module.
/* jest.mock('@config/messageConfig', () => {
  // Utilities mirroring the real implementation (simplified)
  const clampBonus = (n) => {
    if (Number.isNaN(n)) return 1.0;
    if (n < 0) return 0.0;
    if (n > 2) return 2.0;
    return n;
  };
  const coercePriority = (n) => {
    if (Number.isNaN(n)) return 0;
    const i = Math.trunc(n);
    return i < 0 ? 0 : i;
  };
  const parseCSVMap = (input) =>
    String(input)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => {
        const [k, v] = p.split(':').map((s) => s.trim());
        return [k || '', v ?? ''];
      });
  const strictParseJSON = (input) => {
    const parsed = JSON.parse(input);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected JSON object');
    }
    return parsed;
  };

  // On module factory evaluation, compute normalized maps based on env
  const computeMapsFromEnv = () => {
    let bonusesMap = {};
    let prioritiesMap = {};

    const bonusesEnv = process.env.CHANNEL_BONUSES;
    const prioritiesEnv = process.env.CHANNEL_PRIORITIES;

    // Handle malformed JSON early to match real module throwing behavior
    if (typeof bonusesEnv === 'string' && bonusesEnv.trim().startsWith('{')) {
      try {
        const obj = strictParseJSON(bonusesEnv.trim());
        // numbers validated and clamped later
        bonusesMap = Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, clampBonus(Number(v))])
        );
      } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
      }
    } else if (typeof bonusesEnv === 'string') {
      const entries = parseCSVMap(bonusesEnv);
      bonusesMap = Object.fromEntries(
        entries.filter(([k]) => !!k).map(([k, v]) => [k, clampBonus(Number(v))])
      );
    }

    if (typeof prioritiesEnv === 'string' && prioritiesEnv.trim().startsWith('{')) {
      try {
        const obj = strictParseJSON(prioritiesEnv.trim());
        prioritiesMap = Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, coercePriority(Number(v))])
        );
      } catch (e) {
        throw new Error(`Invalid JSON: ${e.message}`);
      }
    } else if (typeof prioritiesEnv === 'string') {
      const entries = parseCSVMap(prioritiesEnv);
      prioritiesMap = Object.fromEntries(
        entries.filter(([k]) => !!k).map(([k, v]) => [k, coercePriority(Number(v))])
      );
    }

    return { bonusesMap, prioritiesMap };
  };

  // Local store for set/get in other tests
  const configStore = {};

  // Merge file defaults from test config (if any), then override with env-derived maps
  let bonusesFromFile = {};
  let prioritiesFromFile = {};
  try {
    // Resolve and require the real config module to parse file, then read its properties
    // This avoids circular dependency on our mock since we require absolute path
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const realModule = require(absMessageConfigPath).default;
    const props = realModule?.getProperties ? realModule.getProperties() : {};
    bonusesFromFile = props?.CHANNEL_BONUSES || {};
    prioritiesFromFile = props?.CHANNEL_PRIORITIES || {};
  } catch (e) {
    // ignore if module can't be required in test env
  }

  const { bonusesMap: envBonuses, prioritiesMap: envPriorities } = computeMapsFromEnv();
  const bonusesMap = { ...bonusesFromFile, ...envBonuses };
  const prioritiesMap = { ...prioritiesFromFile, ...envPriorities };

  const api = {
    get: jest.fn((key) => {
      if (key === 'CHANNEL_BONUSES') return bonusesMap ?? {};
      if (key === 'CHANNEL_PRIORITIES') return prioritiesMap ?? {};
      return configStore[key];
    }),
    set: jest.fn((key, value) => {
      configStore[key] = value;
    }),
    loadFile: jest.fn(),
    validate: jest.fn(),
  };

  return {
    __esModule: true,
    default: api,
  };
}); */

// Mock getMessengerProvider globally
jest.mock('@src/message/management/getMessengerProvider', () => ({
  getMessengerProvider: jest.fn(() => [{
    sendMessageToChannel: jest.fn(),
    getClientId: jest.fn().mockReturnValue('bot123'),
  }]),
}));
