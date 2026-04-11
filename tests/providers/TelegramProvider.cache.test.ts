import fs from 'fs';
import path from 'path';
import { TelegramProvider } from '../../src/providers/TelegramProvider';

// Mock dependencies
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
}));

// Mock process.cwd to return a fixed path
const originalCwd = process.cwd;
const originalEnv = process.env;

beforeAll(() => {
  process.cwd = jest.fn().mockReturnValue('/app');
});

afterAll(() => {
  process.cwd = originalCwd;
  process.env = originalEnv;
});

describe('TelegramProvider getClientId() caching', () => {
  let provider: TelegramProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new TelegramProvider();
    // Reset the cachedClientId by creating a new instance
    (provider as any).cachedClientId = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('caching behavior', () => {
    it('should cache the client ID on first call', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '123456789:ABCdefGHIjklMNO123pqrSTUvwxYZ' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      // First call - should read from file
      const result1 = provider.getClientId();
      expect(result1).toBe('123456789');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = provider.getClientId();
      expect(result2).toBe('123456789');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Third call - should still use cache
      const result3 = provider.getClientId();
      expect(result3).toBe('123456789');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should return cached value even if file becomes unreadable', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '987654321:XYZabcDEF456ghiJKL789mnoPQR' }],
        },
      };

      // First call succeeds
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));
      const result1 = provider.getClientId();
      expect(result1).toBe('987654321');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      // File becomes unreadable
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      // Should still return cached value
      const result2 = provider.getClientId();
      expect(result2).toBe('987654321');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should cache fallback value when config file is missing', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      const result1 = provider.getClientId();
      expect(result1).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      const result2 = provider.getClientId();
      expect(result2).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should cache fallback value when instances array is empty', () => {
      const mockConfig = {
        telegram: {
          instances: [],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      // Verify caching
      const result2 = provider.getClientId();
      expect(result2).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should cache fallback value when token is missing', () => {
      const mockConfig = {
        telegram: {
          instances: [{}], // No token property
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      // Verify caching
      const result2 = provider.getClientId();
      expect(result2).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully and cache fallback', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      const result1 = provider.getClientId();
      expect(result1).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      const result2 = provider.getClientId();
      expect(result2).toBe('telegram');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('token parsing', () => {
    it('should extract bot ID from token correctly', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '12345:ABCdefGHIjklMNO123pqrSTUvwxYZ456' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('12345');
    });

    it('should handle tokens with underscores and hyphens', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '999888777:AAABC-def_GHIjklMNO123pqrSTUvwx' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('999888777');
    });

    it('should handle long bot IDs', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '1234567890:ABCdefGHIjklMNO123pqrSTUvwxYZ' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('1234567890');
    });
  });

  describe('edge cases', () => {
    it('should handle NODE_CONFIG_DIR environment variable', () => {
      process.env.NODE_CONFIG_DIR = '/custom/config';
      const mockConfig = {
        telegram: {
          instances: [{ token: '555666777:ABCdefGHIjklMNO123pqrSTUvwxYZ' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      provider.getClientId();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/custom/config/providers/messengers.json',
        'utf8'
      );
    });

    it('should use default path when NODE_CONFIG_DIR is not set', () => {
      delete process.env.NODE_CONFIG_DIR;
      const mockConfig = {
        telegram: {
          instances: [{ token: '111222333:ABCdefGHIjklMNO123pqrSTUvwxYZ' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      provider.getClientId();

      // path.join is called twice: once for cwd + 'config', then for the full path
      expect(path.join).toHaveBeenCalled();
    });

    it('should handle multiple instances but only use first one', () => {
      const mockConfig = {
        telegram: {
          instances: [
            { token: '111111111:ABCdefGHIjklMNO123pqrSTUvwxYZ' },
            { token: '222222222:DEFghiJKLmnoPQR456stuVWXyz' },
          ],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('111111111'); // First instance only
    });

    it('should handle missing telegram property in config', () => {
      const mockConfig = {};

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('telegram');
    });

    it('should handle missing instances property', () => {
      const mockConfig = {
        telegram: {},
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      const result = provider.getClientId();
      expect(result).toBe('telegram');
    });
  });

  describe('performance', () => {
    it('should demonstrate cache performance benefit', () => {
      const mockConfig = {
        telegram: {
          instances: [{ token: '999999999:ABCdefGHIjklMNO123pqrSTUvwxYZ' }],
        },
      };

      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

      // Call 100 times
      for (let i = 0; i < 100; i++) {
        provider.getClientId();
      }

      // File should only be read once due to caching
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
