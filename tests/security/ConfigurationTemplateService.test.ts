import { PathSecurityUtils } from '../../src/server/utils/pathSecurity';

describe('ConfigurationTemplateService Path Security', () => {
  const templatesDir = '/app/config/templates';

  it('getSafeTemplatePath should return null and not throw for malicious template IDs (mirroring service logic)', async () => {
    const maliciousId = '../../etc/passwd';

    expect(() => PathSecurityUtils.getSafePath(templatesDir, `${maliciousId}.json`)).toThrow('Security Error: Path traversal detected');
  });

  it('getSafeTemplatePath should return a valid path for safe IDs', async () => {
    const safeId = 'my-template';
    const result = PathSecurityUtils.getSafePath(templatesDir, `${safeId}.json`);

    expect(result).toContain('config/templates/my-template.json');
  });
});
