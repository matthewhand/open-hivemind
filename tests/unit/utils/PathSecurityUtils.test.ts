import path from 'path';
import { PathSecurityUtils } from '@src/utils/PathSecurityUtils';

describe('PathSecurityUtils', () => {
  describe('isPathWithinDirectory', () => {
    it('returns true for a path inside the base directory', () => {
      const base = '/app/uploads';
      const target = path.resolve('/app/uploads/file.txt');
      expect(PathSecurityUtils.isPathWithinDirectory(target, base)).toBe(true);
    });

    it('returns true when target equals the base directory', () => {
      const base = '/app/uploads';
      expect(PathSecurityUtils.isPathWithinDirectory(base, base)).toBe(true);
    });

    it('returns false for a path traversal attack', () => {
      const base = '/app/uploads';
      const target = '/app/uploads/../../../etc/passwd';
      expect(PathSecurityUtils.isPathWithinDirectory(target, base)).toBe(false);
    });

    it('returns false for a sibling directory', () => {
      const base = '/app/uploads';
      const target = '/app/other/file.txt';
      expect(PathSecurityUtils.isPathWithinDirectory(target, base)).toBe(false);
    });

    it('returns false for a path that is a prefix but not a subdirectory', () => {
      const base = '/app/uploads';
      const target = '/app/uploads-extra/file.txt';
      expect(PathSecurityUtils.isPathWithinDirectory(target, base)).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('strips directory components from a path traversal attempt', () => {
      expect(PathSecurityUtils.sanitizeFilename('../../../etc/passwd')).toBe('passwd');
    });

    it('returns the filename from a normal path', () => {
      expect(PathSecurityUtils.sanitizeFilename('subdir/file.txt')).toBe('file.txt');
    });

    it('returns a plain filename unchanged', () => {
      expect(PathSecurityUtils.sanitizeFilename('file.txt')).toBe('file.txt');
    });
  });

  describe('getSafePath', () => {
    it('returns a safe joined path for a valid filename', () => {
      const base = '/app/uploads';
      const result = PathSecurityUtils.getSafePath(base, 'user-file.txt');
      expect(result).toBe(path.join(base, 'user-file.txt'));
    });

    it('sanitizes directory traversal before joining', () => {
      const base = '/app/uploads';
      // "../etc/passwd" is sanitized to "passwd" then joined
      const result = PathSecurityUtils.getSafePath(base, '../etc/passwd');
      expect(result).toBe(path.join(base, 'passwd'));
    });
  });

  describe('isValidFilename', () => {
    it('accepts a normal alphanumeric filename', () => {
      expect(PathSecurityUtils.isValidFilename('file_123.txt')).toBe(true);
    });

    it('rejects filenames with spaces', () => {
      expect(PathSecurityUtils.isValidFilename('file name.txt')).toBe(false);
    });

    it('rejects filenames exceeding maxLength', () => {
      const long = 'a'.repeat(256);
      expect(PathSecurityUtils.isValidFilename(long)).toBe(false);
    });

    it('accepts filenames at exactly maxLength', () => {
      const exact = 'a'.repeat(255);
      expect(PathSecurityUtils.isValidFilename(exact)).toBe(true);
    });

    it('enforces custom maxLength', () => {
      expect(PathSecurityUtils.isValidFilename('abcde', { maxLength: 4 })).toBe(false);
      expect(PathSecurityUtils.isValidFilename('abcd', { maxLength: 4 })).toBe(true);
    });

    it('checks allowed extensions', () => {
      expect(
        PathSecurityUtils.isValidFilename('file.txt', { allowedExtensions: ['.txt', '.pdf'] })
      ).toBe(true);
      expect(
        PathSecurityUtils.isValidFilename('file.exe', { allowedExtensions: ['.txt', '.pdf'] })
      ).toBe(false);
    });

    it('uses custom pattern when provided', () => {
      expect(
        PathSecurityUtils.isValidFilename('HELLO', { allowedPattern: /^[A-Z]+$/ })
      ).toBe(true);
      expect(
        PathSecurityUtils.isValidFilename('hello', { allowedPattern: /^[A-Z]+$/ })
      ).toBe(false);
    });
  });
});
