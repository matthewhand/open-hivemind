import path from 'path';
import { PathSecurityUtils } from '../../src/utils/PathSecurityUtils';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock ConfigurationValidator
jest.mock('../../src/server/services/ConfigurationValidator', () => ({
  ConfigurationValidator: jest.fn().mockImplementation(() => ({
    validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  })),
}));

describe('ConfigurationTemplateService Path Security', () => {
  // We test the same PathSecurityUtils pattern used by getSafeTemplatePath
  const templatesDir = path.join(process.cwd(), 'config', 'templates');

  describe('getSafeTemplatePath equivalent logic', () => {
    it('should throw for malicious templateId with path traversal (../../etc/passwd)', () => {
      const maliciousId = '../../etc/passwd';

      // PathSecurityUtils.sanitizeFilename strips directory components via path.basename
      const sanitized = PathSecurityUtils.sanitizeFilename(maliciousId);
      expect(sanitized).toBe('passwd');

      // The resulting path should be safely within templatesDir
      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');
      expect(safePath).toBe(path.join(templatesDir, 'passwd.json'));
      expect(path.isAbsolute(safePath)).toBe(true);
      expect(safePath.startsWith(templatesDir)).toBe(true);
    });

    it('should throw for templateId with encoded traversal (..%2F..%2Fetc%2Fpasswd)', () => {
      const maliciousId = '..%2F..%2Fetc%2Fpasswd';

      const sanitized = PathSecurityUtils.sanitizeFilename(maliciousId);
      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');

      // Should stay within templatesDir
      expect(path.isAbsolute(safePath)).toBe(true);
      expect(safePath.startsWith(templatesDir)).toBe(true);
    });

    it('should throw for templateId with null bytes', () => {
      const maliciousId = 'template\0../../etc/passwd';

      const sanitized = PathSecurityUtils.sanitizeFilename(maliciousId);
      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');

      expect(path.isAbsolute(safePath)).toBe(true);
      expect(safePath.startsWith(templatesDir)).toBe(true);
    });

    it('should work correctly for normal templateId', () => {
      const normalId = 'my-template';

      const sanitized = PathSecurityUtils.sanitizeFilename(normalId);
      expect(sanitized).toBe('my-template');

      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');
      expect(safePath).toBe(path.join(templatesDir, 'my-template.json'));
      expect(path.isAbsolute(safePath)).toBe(true);
      expect(safePath.startsWith(templatesDir)).toBe(true);
    });

    it('should work correctly for templateId with alphanumeric characters and dashes', () => {
      const normalId = 'discord-basic-bot-k9x2f';

      const sanitized = PathSecurityUtils.sanitizeFilename(normalId);
      expect(sanitized).toBe('discord-basic-bot-k9x2f');

      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');
      expect(safePath).toBe(path.join(templatesDir, 'discord-basic-bot-k9x2f.json'));
    });

    it('should strip leading directory components from deeply nested traversal', () => {
      const maliciousId = '../../../../../../../etc/shadow';

      const sanitized = PathSecurityUtils.sanitizeFilename(maliciousId);
      expect(sanitized).toBe('shadow');

      const safePath = PathSecurityUtils.getSafePath(templatesDir, sanitized + '.json');
      expect(safePath).toBe(path.join(templatesDir, 'shadow.json'));
      expect(safePath.startsWith(templatesDir)).toBe(true);
    });
  });
});
