import {
  getConfiguredCorsOrigins,
  parseOriginList,
  resolveCorsDecision,
} from '@src/server/corsOrigins';

// Stored-settings source (config/user-config.json). corsOrigins lazy-requires
// this module, so the mock intercepts it.
const getGeneralSettings = jest.fn();
jest.mock('@src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({ getGeneralSettings }),
  },
}));

describe('corsOrigins', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ORIGIN;
    delete process.env.CORS_ALLOWED_ORIGINS;
    getGeneralSettings.mockReturnValue({});
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('parseOriginList', () => {
    it('splits comma-separated strings and trims whitespace', () => {
      expect(parseOriginList('https://a.example, https://b.example ,')).toEqual([
        'https://a.example',
        'https://b.example',
      ]);
    });

    it('accepts string arrays and drops non-strings/empties', () => {
      expect(parseOriginList(['https://a.example', '', 42, ' https://b.example '])).toEqual([
        'https://a.example',
        'https://b.example',
      ]);
    });

    it('returns [] for unset or unknown shapes', () => {
      expect(parseOriginList(undefined)).toEqual([]);
      expect(parseOriginList(null)).toEqual([]);
      expect(parseOriginList({})).toEqual([]);
    });
  });

  describe('getConfiguredCorsOrigins', () => {
    it('merges CORS_ORIGIN, CORS_ALLOWED_ORIGINS and the stored cors.origins setting', () => {
      process.env.CORS_ORIGIN = 'https://env.example';
      process.env.CORS_ALLOWED_ORIGINS = 'https://alias.example';
      getGeneralSettings.mockReturnValue({ 'cors.origins': ['https://stored.example'] });

      expect(getConfiguredCorsOrigins()).toEqual([
        'https://env.example',
        'https://alias.example',
        'https://stored.example',
      ]);
    });

    it('survives a failing settings store (env still honored)', () => {
      process.env.CORS_ORIGIN = 'https://env.example';
      getGeneralSettings.mockImplementation(() => {
        throw new Error('store unavailable');
      });

      expect(getConfiguredCorsOrigins()).toEqual(['https://env.example']);
    });
  });

  describe('resolveCorsDecision', () => {
    it('always allows localhost and 127.0.0.1 with credentials (legacy fallback)', () => {
      for (const origin of ['http://localhost', 'http://localhost:5005', 'http://127.0.0.1:3000']) {
        expect(resolveCorsDecision(origin, [])).toEqual({
          allowOrigin: origin,
          credentials: true,
        });
      }
    });

    it('rejects non-configured origins (current behavior preserved when nothing is set)', () => {
      expect(resolveCorsDecision('https://evil.example', [])).toBeNull();
      expect(resolveCorsDecision('http://localhost.evil.example', [])).toBeNull();
      expect(resolveCorsDecision('https://localhost', [])).toBeNull(); // https not in legacy regex
      expect(resolveCorsDecision(undefined, ['*'])).toBeNull();
    });

    it('reflects configured origins with credentials', () => {
      expect(resolveCorsDecision('https://app.example', ['https://app.example'])).toEqual({
        allowOrigin: 'https://app.example',
        credentials: true,
      });
    });

    it('answers the * wildcard with a literal * and no credentials', () => {
      expect(resolveCorsDecision('https://anywhere.example', ['*'])).toEqual({
        allowOrigin: '*',
        credentials: false,
      });
      // An exact match still wins over the wildcard (credentialed).
      expect(resolveCorsDecision('https://app.example', ['*', 'https://app.example'])).toEqual({
        allowOrigin: 'https://app.example',
        credentials: true,
      });
    });

    it('uses env + stored settings when no list is passed', () => {
      process.env.CORS_ORIGIN = 'https://env.example';
      getGeneralSettings.mockReturnValue({
        'cors.origins': 'https://stored-a.example, https://stored-b.example',
      });

      expect(resolveCorsDecision('https://env.example')).toEqual({
        allowOrigin: 'https://env.example',
        credentials: true,
      });
      expect(resolveCorsDecision('https://stored-b.example')).toEqual({
        allowOrigin: 'https://stored-b.example',
        credentials: true,
      });
      expect(resolveCorsDecision('https://other.example')).toBeNull();
    });
  });
});
