import * as child_process from 'child_process';
import * as fs from 'fs';
import {
  compareVersions,
  isNewerVersion,
  fetchLatestVersionFromGit,
  fetchChangelog,
} from '../../../../src/server/utils/versionTracking';

jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
  },
}));

const mockedExecFile = child_process.execFile as unknown as jest.Mock;
const mockedAccess = fs.promises.access as jest.Mock;

describe('versionTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('compareVersions', () => {
    it('should correctly compare versions', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
      expect(compareVersions('1.2.4', '1.2.3')).toBe(1);
      expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
      expect(compareVersions('v1.2.3', '1.2.4')).toBe(-1);
      expect(compareVersions('1.3.0', '1.2.9')).toBe(1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    });
  });

  describe('isNewerVersion', () => {
    it('should correctly identify newer versions', () => {
      expect(isNewerVersion('1.2.3', '1.2.4')).toBe(true);
      expect(isNewerVersion('1.2.4', '1.2.3')).toBe(false);
      expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false);
    });
  });

  describe('fetchLatestVersionFromGit', () => {
    it('should fetch latest version from tags', async () => {
      mockedAccess.mockResolvedValue(undefined);
      mockedExecFile.mockImplementation((cmd, args, options, callback) => {
        if (args.includes('tag')) {
          callback(null, 'v1.2.5\nv1.2.4\n', '');
        } else {
          callback(null, '', '');
        }
      });

      const version = await fetchLatestVersionFromGit('http://repo.com', '/path/to/plugin');
      expect(version).toBe('1.2.5');
      expect(mockedExecFile).toHaveBeenCalledWith(
        'git',
        ['fetch', '--tags', '--quiet'],
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should fall back to package.json if no tags', async () => {
      mockedAccess.mockResolvedValue(undefined);
      mockedExecFile.mockImplementation((cmd, args, options, callback) => {
        if (args.includes('tag')) {
          callback(null, '', '');
        } else if (
          args.includes('show') &&
          args.some((a: string) => a.includes('origin/main:package.json'))
        ) {
          callback(null, JSON.stringify({ version: '1.2.6' }), '');
        } else {
          callback(null, '', '');
        }
      });

      const version = await fetchLatestVersionFromGit('http://repo.com', '/path/to/plugin');
      expect(version).toBe('1.2.6');
    });
  });

  describe('fetchChangelog', () => {
    it('should fetch changelog entries', async () => {
      mockedAccess.mockResolvedValue(undefined);
      mockedExecFile.mockImplementation((cmd, args, options, callback) => {
        if (args.includes('log')) {
          callback(
            null,
            'sha1|2023-01-01T00:00:00Z|Author|Commit message with 1.2.7\n' +
              'sha2|2023-01-02T00:00:00Z|Author|Another message 1.2.6\n',
            ''
          );
        } else {
          callback(null, '', '');
        }
      });

      const changelog = await fetchChangelog('/path/to/plugin', '1.2.5');
      expect(changelog).toHaveLength(2);
      expect(changelog[0]).toEqual({
        version: '1.2.7',
        date: expect.any(String),
        message: 'Commit message with 1.2.7',
        author: 'Author',
        sha: 'sha1',
      });
    });
  });
});
