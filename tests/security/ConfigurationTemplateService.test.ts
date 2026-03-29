import * as path from 'path';
import { ConfigurationTemplateService } from '../../src/server/services/ConfigurationTemplateService';

describe('ConfigurationTemplateService Path Security', () => {
  let service: ConfigurationTemplateService;

  beforeEach(() => {
    service = ConfigurationTemplateService.getInstance();
  });

  it('getSafeTemplatePath (via private access) should throw for malicious template IDs', async () => {
    const maliciousId = '../../etc/passwd';

    expect(() => (service as any).getSafeTemplatePath(maliciousId)).toThrow('Security Error: Path traversal detected');
  });

  it('getSafeTemplatePath (via private access) should return a valid path for safe IDs', async () => {
    const safeId = 'my-template';
    const result = (service as any).getSafeTemplatePath(safeId);

    expect(result).toContain('config/templates/my-template.json');
  });
});
